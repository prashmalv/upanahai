#!/usr/bin/env bash
# Azure App Service (Linux) startup command for Upanah.AI.
# Set as the app's startup command:  bash /home/site/wwwroot/startup.sh
set -euo pipefail

cd /home/site/wwwroot

# ---------------------------------------------------------------------------
# Why we build here instead of letting Oryx do it
#
# Oryx builds in a throwaway /tmp/<hash> directory and then compresses
# node_modules, so `next build` bakes paths like
#   /tmp/<hash>/node_modules/next/dist/client/link.js
# into .next/server/app/**/page_client-reference-manifest.js. At runtime those
# paths don't exist (node_modules is extracted elsewhere), and every route whose
# page is a client component dies with
#   "Could not find the module ... in the React Client Manifest".
#
# Building right here means build-time and runtime paths are identical, so the
# manifests always resolve. Costs ~8 min on the first boot after a deploy; every
# later boot reuses .next and starts in seconds.
# ---------------------------------------------------------------------------

if [ ! -f node_modules/.package-lock.json ]; then
  echo "[startup] installing dependencies..."
  npm install --no-audit --no-fund
fi

# Make sure the Prisma client can actually load its query engine, and repair it
# here if it can't.
#
# Boot is the only safe moment for this. `prisma generate` puts the engine in
# place with a rename, and /home is an SMB mount: while the app is running it
# holds an open handle on that .so, so the rename fails with ENOENT and — worse —
# SMB leaves the filename in a delete-pending state where it cannot be recreated
# at all. Repairing from outside the app is therefore impossible; repairing here,
# before `npm start`, works because nothing has the file open yet.
#
# Checking that the client *loads* rather than that a file exists matters: a
# half-finished generate leaves index.js present but the engine missing, which
# looks fine to a file test and fails on the first query.
client_loads() {
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$queryRawUnsafe('SELECT 1').then(() => process.exit(0)).catch(() => process.exit(1));
  " >/dev/null 2>&1
}

if ! client_loads; then
  echo "[startup] Prisma client cannot reach its engine — regenerating"
  rm -rf node_modules/.prisma node_modules/.prisma-old node_modules/.prisma/client.bak
  npx --no-install prisma generate 2>&1 | tail -2 || npx prisma generate 2>&1 | tail -2
  if client_loads; then
    echo "[startup] Prisma client repaired"
  else
    echo "[startup] WARNING: Prisma client still broken — database pages will fail"
  fi
else
  echo "[startup] Prisma client ok"
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "[startup] no .next/BUILD_ID — building (this takes several minutes)..."
  # next build directly, NOT npm run build — see the prisma generate note above.
  npx --no-install next build
  echo "[startup] build complete"
else
  echo "[startup] reusing existing build $(cat .next/BUILD_ID)"
fi

# /home is the only mount that survives restarts & scale operations on App Service,
# so the SQLite file must live there (DATABASE_URL=file:/home/data/dev.db).
mkdir -p /home/data

echo "[startup] syncing database schema..."
npx --no-install prisma db push --skip-generate --accept-data-loss \
  || npx prisma db push --skip-generate --accept-data-loss

# The catalog comes from the brands' own storefronts, not from a seed.
#
# prisma/seed.ts is still in the repo but is deliberately NOT run here. Its data
# was invented — prices attributed to Amazon and Myntra that nobody had checked,
# review counts nobody had written — and an empty catalog is a better thing to ship
# than a false one. The import below is the only way listings get in.
#
# It runs only when there is nothing real yet, so a restart never re-fetches
# fourteen storefronts for no reason and never wipes a catalog that is already
# good. --drop-seed removes any invented rows still lying around from before.
REAL=$(npx --no-install tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.product.count({ where: { NOT: { sourcedFrom: '' } } })
  .then((n) => { console.log(n); return p.\$disconnect(); })
  .catch(() => { console.log(0); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
# The guard has to consider BOTH numbers. A first attempt used "fewer than 50 real
# listings", and when a production import died two brands in it left 63 real rows
# beside 16 invented ones — over the threshold, so every later boot skipped the
# import and the invented rows would have lived there forever. Finish the job if
# either there is little real data or any seeded row survives.
SEEDED=$(npx --no-install tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.product.count({ where: { sourcedFrom: '' } })
  .then((n) => { console.log(n); return p.\$disconnect(); })
  .catch(() => { console.log(0); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
if [ "${REAL:-0}" -lt 200 ] || [ "${SEEDED:-0}" -gt 0 ]; then
  echo "[startup] catalog: ${REAL:-0} real, ${SEEDED:-0} seeded — importing from brand stores"
  npx --no-install tsx scripts/import-brand-catalog.ts --per-brand 30 --drop-seed || \
    echo "[startup] catalog import failed — leaving the catalog as it is"
else
  echo "[startup] catalog already has ${REAL} real listings — skipping import"
fi

# Admin provisioning is idempotent and never resets an existing password, so it
# is safe to run on every boot (and it survives a fresh database).
echo "[startup] ensuring admin account..."
npx --no-install tsx prisma/ensure-admin.ts || npx tsx prisma/ensure-admin.ts || \
  echo "[startup] admin provisioning failed — site still starting"

# Hide products whose image no longer loads, so no card renders without a
# picture. Cheap (a few HTTP requests) and self-healing: an image that comes back
# online is un-hidden on the next boot.
echo "[startup] validating product images..."
npx --no-install tsx prisma/validate-images.ts || npx tsx prisma/validate-images.ts || \
  echo "[startup] image validation failed — site still starting"

# Refresh each brand's own best-seller list — but only when ours is a week stale.
#
# Two reasons for the guard. It hits five brands' storefronts, and doing that on
# every restart would be rude to them for no benefit; and a failed fetch leaves the
# previous rows in place, so a weekly cadence degrades gracefully rather than
# emptying the page. The freshness date is shown to readers either way, so stale
# data is visible rather than silently passed off as current.
STALE_DAYS=7
NEEDS_PICKS=$(npx --no-install tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.brandPick.findFirst({ orderBy: { fetchedAt: 'desc' }, select: { fetchedAt: true } })
  .then((r) => {
    const ageDays = r ? (Date.now() - r.fetchedAt.getTime()) / 86400000 : 999;
    console.log(ageDays > ${STALE_DAYS} ? 'yes' : 'no');
    return p.\$disconnect();
  })
  .catch(() => { console.log('yes'); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
if [ "$NEEDS_PICKS" = "yes" ]; then
  echo "[startup] refreshing brand best-seller lists..."
  npx --no-install tsx scripts/refresh-brand-picks.ts || \
    echo "[startup] brand pick refresh failed — keeping the previous lists"
else
  echo "[startup] brand best-seller lists are current — skipping refresh"
fi

echo "[startup] starting Next.js on port ${PORT:-8080}"
exec npm start
