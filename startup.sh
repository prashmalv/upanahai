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

# Generate the Prisma client only when it's actually missing.
#
# `npm run build` runs `prisma generate && next build`, and prisma generate
# rewrites node_modules/.prisma by renaming the query engine into place. /home is
# an SMB network mount, so if any process still holds that .so the rename fails
# with ENOENT, the build dies, the container restarts, and it loops forever —
# taking the site down. Generating only when absent removes that race.
if [ ! -f node_modules/.prisma/client/index.js ]; then
  echo "[startup] generating Prisma client..."
  npx --no-install prisma generate || npx prisma generate
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

# prisma/seed.ts is destructive (it deleteMany()s products, offers, wishlist and
# feedback), so only ever run it against an empty catalog — never on every boot.
echo "[startup] checking catalog..."
COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.product.count()
  .then((c) => { console.log(c); })
  .catch(() => { console.log(0); })
  .finally(() => p.\$disconnect());
" 2>/dev/null | tail -1)

if [ "${COUNT:-0}" = "0" ]; then
  echo "[startup] catalog empty — seeding"
  npx --no-install tsx prisma/seed.ts || npx tsx prisma/seed.ts
else
  echo "[startup] catalog already has ${COUNT} products — skipping seed"
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

echo "[startup] starting Next.js on port ${PORT:-8080}"
exec npm start
