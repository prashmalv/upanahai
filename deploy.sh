#!/usr/bin/env bash
# Deploy to the Azure App Service (upanah.com) with the shortest downtime this
# single-instance setup allows.
#
# WHY IT IS SHAPED LIKE THIS
#
# The obvious sequence — upload source, delete .next, restart so the app rebuilds
# on boot — takes the live site down for the whole build (~8-10 min). Worse, the
# moment .next is deleted the *currently running* server starts throwing
# "Cannot find module .next/server/app/**/route.js" on every request, so the site
# breaks before the new build even starts.
#
# So instead: build into .next-new while the old build keeps serving, swap the
# directories, then restart. Downtime shrinks to the restart itself (~1 min).
#
# Requires: az CLI logged in. Note `az webapp` commands are broken on some local
# Python installs (pyexpat), which is why everything here goes through az rest.
set -euo pipefail

APP="${AZ_APP:-upanah-ai}"
RG="${AZ_RG:-upanah-ai-rg}"
SCM="https://${APP}.scm.azurewebsites.net"

say() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }
die() { printf "\n\033[1;31m!! %s\033[0m\n" "$1" >&2; exit 1; }

# Find the subscription that actually contains this app, rather than trusting
# whichever one az happens to have selected.
#
# The id is deliberately not hardcoded — this repo is public. But reading
# `az account show` blindly is worse: if the CLI is pointed at a different
# subscription (easy to do, and it happened), every ARM call 404s with
# "ResourceGroupNotFound" and every Kudu call 403s, which looks like a broken
# deployment rather than a wrong context.
resolve_sub() {
  if [ -n "${AZ_SUB:-}" ]; then printf '%s' "$AZ_SUB"; return; fi
  local found
  found=$(az account list --query "[].id" -o tsv 2>/dev/null | while read -r s; do
    if az resource show --ids \
        "/subscriptions/$s/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}" \
        -o none 2>/dev/null; then printf '%s' "$s"; break; fi
  done)
  [ -n "$found" ] || die "Could not find ${APP} in any subscription this az session can see. Run 'az login' or set AZ_SUB."
  printf '%s' "$found"
}

SUB="$(resolve_sub)"
ARM="https://management.azure.com/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}"
echo "using subscription ${SUB}"

token() {
  # --subscription pins the token to the right tenant even if the CLI's active
  # subscription is elsewhere.
  az account get-access-token --subscription "$SUB" \
    --resource https://management.azure.com --query accessToken -o tsv
}

# Run a script on the App Service.
#
# The script is uploaded as a file and then executed, rather than inlined into
# Kudu's `command` field. Inlining means the script text ends up inside a
# double-quoted `bash -c "..."` argument, so the first double quote *in the
# script* closes it and bash dies with "unexpected end of file". Uploading
# sidesteps quoting entirely and works for any script body.
remote() { # remote <shell script text>
  local tmp="_deploy_step.sh"
  printf '%s\n' "$1" > "/tmp/${tmp}"
  curl -sS -X PUT -H "Authorization: Bearer $(token)" -H "If-Match: *" \
    -H "Content-Type: application/octet-stream" --data-binary "@/tmp/${tmp}" \
    "${SCM}/api/vfs/site/wwwroot/${tmp}" -o /dev/null
  # Kudu occasionally answers with something that isn't JSON (403 with an empty
  # body when the token is for the wrong tenant, an HTML error page under load).
  # Parsing that blindly used to abort the whole deploy with a Python traceback
  # that said nothing about the real cause.
  curl -sS -m 1800 -X POST -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" \
    -w '\n__HTTP__%{http_code}' \
    -d "{\"command\":\"bash ${tmp}\",\"dir\":\"/home/site/wwwroot\"}" "${SCM}/api/command" \
    | python3 -c '
import sys, json
raw = sys.stdin.read()
body, _, code = raw.rpartition("__HTTP__")
code = code.strip() or "?"
body = body.strip()
if code != "200":
    sys.stderr.write(f"Kudu returned HTTP {code}: {body[:200] or '"'"'(empty body)'"'"'}\n")
    sys.exit(0)
try:
    d = json.loads(body)
except Exception:
    sys.stderr.write(f"Kudu returned non-JSON: {body[:200]}\n")
    sys.exit(0)
print(d.get("Output") or "")
e = (d.get("Error") or "").strip()
if e:
    sys.stderr.write("STDERR: " + e[-900:] + "\n")
'
}

say "0/5  type-check and build locally first (never ship what does not compile)"
npx prisma generate >/dev/null
npx tsc --noEmit
npm run build >/dev/null
echo "local build ok"

say "1/5  packaging source + the generated Prisma client"
ZIP=$(mktemp -t upanah-deploy-XXXXX).zip
zip -r -q "$ZIP" \
  src prisma public package.json package-lock.json next.config.mjs \
  postcss.config.mjs tailwind.config.ts tsconfig.json startup.sh deploy.sh README.md \
  -x "prisma/*.db" "prisma/*.db-journal" "public/uploads/*"
zip -q "$ZIP" public/uploads/.gitkeep

echo "$(du -h "$ZIP" | cut -f1) source package"

# Ship the generated Prisma client's JS and types — but NOT the engine binaries.
#
# `prisma generate` cannot be run on the App Service at all: it installs the query
# engine with a rename, /home is an SMB mount, and while the app holds that .so
# open the rename fails AND leaves the filename in a delete-pending state where it
# can no longer be created. That took the database layer down once already, and no
# amount of copying from outside the app could repair it.
#
# The JS client is what changes when the schema changes; the engine only changes
# with the Prisma version. So generate locally, ship the JS, and never touch the
# engine on the server. If the Prisma version is ever bumped, the engine must be
# replaced during a restart instead — startup.sh detects and repairs that case.
#
# It travels as its own archive, uploaded over VFS and unzipped during the build,
# rather than inside the deploy zip: Kudu's zip publish silently drops everything
# under node_modules/. It reported http 200, extracted src/ correctly, and left
# the client at the previous deploy's version — so the build type-checked new code
# against an old client and failed on a column that genuinely existed.
CLIENT_ZIP=$(mktemp -t upanah-client-XXXXX).zip
rm -f "$CLIENT_ZIP"
zip -q -r "$CLIENT_ZIP" \
  node_modules/.prisma/client/index.js \
  node_modules/.prisma/client/index.d.ts \
  node_modules/.prisma/client/default.js \
  node_modules/.prisma/client/default.d.ts \
  node_modules/.prisma/client/edge.js \
  node_modules/.prisma/client/edge.d.ts \
  node_modules/.prisma/client/wasm.js \
  node_modules/.prisma/client/wasm.d.ts \
  node_modules/.prisma/client/index-browser.js \
  node_modules/.prisma/client/package.json \
  node_modules/.prisma/client/schema.prisma
echo "$(du -h "$CLIENT_ZIP" | cut -f1) generated Prisma client (no engines)"

say "2/5  uploading (clean=false keeps node_modules; no restart yet)"
curl -sS -X POST -H "Authorization: Bearer $(token)" -H "Content-Type: application/zip" \
  --data-binary "@$ZIP" \
  "${SCM}/api/publish?type=zip&clean=false&restart=false" -o /dev/null -w "  source http %{http_code}\n"
rm -f "$ZIP"

curl -sS -X PUT -H "Authorization: Bearer $(token)" -H "If-Match: *" \
  -H "Content-Type: application/octet-stream" --data-binary "@$CLIENT_ZIP" \
  "${SCM}/api/vfs/prisma-client.zip" -o /dev/null -w "  client http %{http_code}\n"
rm -f "$CLIENT_ZIP"

say "3/5  building into .next-new, detached (site keeps serving the old build)"
# Kudu's /api/command times out around 4 minutes; a full next build takes 8-10.
# So the build is launched with setsid + nohup so it outlives the HTTP request,
# and we poll for a completion marker instead of holding the connection open.
LAUNCH=$(remote '
set -e
cd /home/site/wwwroot
rm -f /home/build-new.log /home/build-new.done
cat > /home/dobuild-new.sh <<INNER
#!/bin/bash
cd /home/site/wwwroot
export NEXT_DIST_DIR=.next-new
export DATABASE_URL=file:/home/data/dev.db
rm -rf .next-new

# Install only when the lockfile actually changed. Every install rewrites packages
# with renames, and on this SMB mount a rename of a file the running app holds open
# fails with EACCES — sharp is the one that trips it. Dependencies change rarely;
# reinstalling on every deploy risks a live dependency for no gain.
LOCK=\$(md5sum package-lock.json | cut -d" " -f1)
if [ "\$LOCK" != "\$(cat /home/npm-lock.md5 2>/dev/null)" ]; then
  # --ignore-scripts: the postinstall runs prisma generate, which renames the query
  # engine .so into place; same SMB rename hazard, and it poisons the filename so it
  # can no longer even be recreated. The generated client is uploaded instead.
  npm install --no-audit --no-fund --ignore-scripts \
    || echo "npm install reported errors — continuing with the existing node_modules"
  # The hash is recorded after the build succeeds, not here. sharp reliably fails
  # its rename against a file the running app holds open, so keying off the exit
  # code would mean re-running the same no-op install on every single deploy.
else
  echo "dependencies unchanged — skipping npm install"
fi

# Unzip the generated client after any install, so a reify pass cannot put the
# previous version back.
if [ -f /home/prisma-client.zip ]; then
  unzip -o -q /home/prisma-client.zip -d /home/site/wwwroot && echo "prisma client refreshed"
fi

# Refuse to build against a stale client. Without this the failure surfaces as a
# type error claiming a column does not exist when it plainly does in the schema,
# which is a genuinely confusing thing to debug. The client keeps a copy of the
# schema it was generated from; prisma format aligns it, so compare on content.
norm() { tr -s " \\t" " " < "\$1" | sed "s/^ *//;s/ *\$//" | grep -v "^\$"; }
if ! diff -q <(norm prisma/schema.prisma) <(norm node_modules/.prisma/client/schema.prisma) >/dev/null; then
  echo "FATAL: the Prisma client on the server was generated from a different schema."
  echo "       Run npx prisma generate locally and deploy again."
  echo EXIT=1
  echo DONE > /home/build-new.done
  exit 1
fi

# Bring the schema up to date before compiling: the build type-checks against the
# client, and a new column that exists in the client but not the database would
# pass the build and then fail on the first query.
npx --no-install prisma db push --skip-generate --accept-data-loss 2>&1 | tail -2
npx --no-install next build
BUILD_RC=\$?
if [ \$BUILD_RC -eq 0 ]; then echo "\$LOCK" > /home/npm-lock.md5; fi
echo EXIT=\$BUILD_RC
echo DONE > /home/build-new.done
INNER
chmod +x /home/dobuild-new.sh
# The heredoc above is the fragile part of this script: it is nested inside a
# single-quoted argument, so one apostrophe in a comment silently ends the quote
# and the terminator is never found. When that happens the build is never
# launched, and without this check the deploy sits there politely polling for a
# marker that nothing will ever write — for fifteen minutes, in one case.
tail -1 /home/dobuild-new.sh | grep -q build-new.done || { echo "FATAL: inner build script was truncated — check the quoting in deploy.sh"; exit 1; }
setsid nohup /home/dobuild-new.sh > /home/build-new.log 2>&1 < /dev/null &
disown
echo launched
')
echo "$LAUNCH"
printf "%s" "$LAUNCH" | grep -q launched || die "the build never started — nothing was changed on the server"

printf "  waiting for the build"
for i in $(seq 1 60); do
  if remote 'test -f /home/build-new.done && echo READY' | grep -q READY; then
    printf " done\n"
    break
  fi
  printf "."
  sleep 20
done

BUILD_OUT=$(remote '
cd /home/site/wwwroot
grep -E "EXIT=|error|Error|Failed" /home/build-new.log | tail -5
test -f .next-new/BUILD_ID || { echo "BUILD FAILED — live build left untouched"; exit 1; }
echo "NEW_BUILD_ID=$(cat .next-new/BUILD_ID)"
')
echo "$BUILD_OUT"
NEW_ID=$(printf "%s" "$BUILD_OUT" | sed -n 's/^NEW_BUILD_ID=//p' | tr -d '\r\n')
[ -n "$NEW_ID" ] || { echo "no build id — aborting before touching the live build"; exit 1; }

say "4/5  swapping the new build in"
remote '
set -e
cd /home/site/wwwroot
rm -rf .next-prev
[ -d .next ] && mv .next .next-prev
mv .next-new .next
echo "swapped; previous build kept in .next-prev for rollback"
'

say "5/5  restarting"
remote 'rm -f /home/site/wwwroot/_deploy_step.sh'
az rest --method post --url "${ARM}/restart?api-version=2023-12-01" -o none

# Wait for THIS build id to appear in the served HTML.
#
# A generic "does / return 200" probe is not enough: a container whose .next was
# swapped out from under it keeps answering 200 on some routes while serving
# stale or half-built pages. Matching the build id proves the new bundle is the
# one actually responding.
say "waiting for build ${NEW_ID} to serve"
for i in $(seq 1 40); do
  if curl -s -m 20 "https://upanah.com/" | grep -q "$NEW_ID"; then
    echo "build ${NEW_ID} live after ${i} checks"
    exit 0
  fi
  sleep 15
done
echo "build ${NEW_ID} did not start serving in time."
echo "Roll back with:  mv .next .next-bad && mv .next-prev .next   (then restart)"
exit 1
