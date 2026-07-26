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
# Taken from the logged-in az session rather than hardcoded — this repo is public
# and a subscription id doesn't belong in it. Override with AZ_SUB if needed.
SUB="${AZ_SUB:-$(az account show --query id -o tsv)}"
SCM="https://${APP}.scm.azurewebsites.net"
ARM="https://management.azure.com/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}"

say() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }
token() { az account get-access-token --resource https://management.azure.com --query accessToken -o tsv; }

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
  curl -sS -m 1800 -X POST -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" \
    -d "{\"command\":\"bash ${tmp}\",\"dir\":\"/home/site/wwwroot\"}" "${SCM}/api/command" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("Output") or ""); e=(d.get("Error") or "").strip(); sys.stderr.write("STDERR: "+e[-900:]+"\n") if e else None'
}

say "0/5  type-check and build locally first (never ship what does not compile)"
npx tsc --noEmit
npm run build >/dev/null
echo "local build ok"

say "1/5  packaging source"
ZIP=$(mktemp -t upanah-deploy-XXXXX).zip
zip -r -q "$ZIP" \
  src prisma public package.json package-lock.json next.config.mjs \
  postcss.config.mjs tailwind.config.ts tsconfig.json startup.sh deploy.sh README.md \
  -x "prisma/*.db" "prisma/*.db-journal" "public/uploads/*"
zip -q "$ZIP" public/uploads/.gitkeep
echo "$(du -h "$ZIP" | cut -f1) package"

say "2/5  uploading (clean=false keeps node_modules; no restart yet)"
curl -sS -X POST -H "Authorization: Bearer $(token)" -H "Content-Type: application/zip" \
  --data-binary "@$ZIP" \
  "${SCM}/api/publish?type=zip&clean=false&restart=false" -o /dev/null -w "  http %{http_code}\n"
rm -f "$ZIP"

say "3/5  building into .next-new, detached (site keeps serving the old build)"
# Kudu's /api/command times out around 4 minutes; a full next build takes 8-10.
# So the build is launched with setsid + nohup so it outlives the HTTP request,
# and we poll for a completion marker instead of holding the connection open.
remote '
set -e
cd /home/site/wwwroot
rm -f /home/build-new.log /home/build-new.done
cat > /home/dobuild-new.sh <<INNER
#!/bin/bash
cd /home/site/wwwroot
export NEXT_DIST_DIR=.next-new
rm -rf .next-new
# --ignore-scripts: the postinstall runs prisma generate, which renames the query
# engine .so into place. /home is an SMB mount, so if the running app still holds
# that file the rename fails with ENOENT and kills the install. The client is
# already generated; startup.sh regenerates it only if genuinely missing.
npm install --no-audit --no-fund --ignore-scripts
npx --no-install next build
echo EXIT=\$?
echo DONE > /home/build-new.done
INNER
chmod +x /home/dobuild-new.sh
setsid nohup /home/dobuild-new.sh > /home/build-new.log 2>&1 < /dev/null &
disown
echo launched
'

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
