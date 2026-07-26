# Upanah.AI 👟

India-first, AI-powered footwear discovery platform — the "Trivago for shoes".
Describe your need in plain language (or voice), and Upanah.AI recommends the
best branded footwear, compares **price & ratings across retailers**, scans your
foot for the **right fit size**, lets you **find shoes from a photo**, **try them
on virtually**, and gives **health-aware suggestions** for men, women, kids,
seniors and sportspersons.

> Built with Next.js 14 (App Router) + TypeScript + Tailwind + Prisma.
> Runs out-of-the-box with a smart heuristic engine and becomes fully "real AI"
> the moment you add Azure OpenAI / OpenAI keys.

---

## ✨ Features (MVP)

| Pillar | What it does |
| --- | --- |
| **AI need-based search** | Natural-language + **voice** search ("comfortable walking shoes for my grandfather under ₹5000") → structured intent → ranked results. |
| **Compare & buy** | Trivago-style price/rating comparison across Amazon, Flipkart, Myntra, brand stores, with redirect-to-buy links + click tracking. |
| **Foot Fit Scan** | Camera/photo + reference object (bank card or A4) → foot length/width, arch type → UK/EU/US size + width recommendation. Saves to profile. |
| **Find by Photo** | Snap/upload any shoe → AI identifies it → shows visually similar branded shoes available in India. |
| **Virtual Try-On (VTON)** | Upload your photo, pick a shoe + outfit style (casual / office / Indian ethnic / sportswear) → preview. Plug in a real VTON model via `VTON_API_URL`. |
| **Accounts, wishlist** | JWT auth, save & compare favourites. |
| **Health tracking** | Log walks/runs/pain → personalized footwear suggestions (arch support, cushioning, etc.). |
| **Personas** | Special handling for seniors (support/comfort) and sportspersons (performance). |

---

## 🚀 Quick start (local)

```bash
# 1. install
npm install

# 2. set up env
cp .env.example .env          # works even with all AI keys blank

# 3. create DB + seed catalog
npm run db:push
npm run db:seed

# 4. run
npm run dev                   # http://localhost:3000
```

Then create your own account at `/login`. No shared demo credentials exist —
a documented password on a live site is an open door.

**Admin access.** Set `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`, then run:

```bash
npx tsx prisma/ensure-admin.ts
```

It is idempotent and never resets an existing password, so it is safe on every
boot (`startup.sh` calls it). Admin unlocks `/admin` — the analytics dashboard
covering reach, search demand, registration geography, purchase intent and the
brand scorecard. Self-signup cannot grant admin.

---

## 🤖 Turning on real AI

The app uses a graceful fallback: with no keys it uses a keyword/heuristic engine
so everything is usable. Add credentials in `.env` to switch to real models:

**Azure OpenAI (recommended since you host on Azure):**
```
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_VISION_DEPLOYMENT=gpt-4o
```
This powers: search-intent parsing, recommendation explanations, **shoe photo
recognition** (Find by Photo) and **foot measurement** (Fit Scan) via vision.

**Virtual Try-On:** deploy a try-on model (e.g. an Azure ML online endpoint) and
set `VTON_API_URL` / `VTON_API_KEY`. The endpoint should accept
`{ person_image, garment_image, category, context }` and return `{ image }`
(data URL or hosted URL). Without it, the try-on page shows an in-browser overlay.

---

## ☁️ Deployment

### Azure App Service (Node) — recommended
`next.config.mjs` uses `output: "standalone"`, so:
```bash
npm run build
# deploy the repo; start command:
node .next/standalone/server.js
```
For production, switch the DB from SQLite to **Azure Database for PostgreSQL**:
1. In `prisma/schema.prisma` set `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. `npx prisma db push && npm run db:seed`.

Set all env vars in **App Service → Configuration**.

### Hostinger (VPS with Node)
Same as above — build, then run `node .next/standalone/server.js` behind Nginx,
or use `npm run start`. SQLite works on a VPS; Postgres/MySQL recommended for scale.
(Hostinger *shared* hosting doesn't run Node, so use a VPS plan.)

---

## 🗂️ Project structure

```
src/
  app/
    page.tsx                 # homepage
    search/                  # AI search + compare results
    product/[slug]/          # product detail, price comparison, reviews
    foot-scan/               # AI fit sizing (camera)
    match/                   # find shoes by photo
    try-on/                  # virtual try-on
    health/                  # activity tracker + suggestions
    wishlist/  account/  login/
    api/                     # search, match, foot-scan, try-on, auth,
                             # wishlist, feedback, health, go (redirect)
  components/                # Navbar, SearchBar (voice), ProductCard, CameraCapture, ...
  lib/
    ai.ts                    # Azure/OpenAI wrapper + graceful fallback
    recommender.ts           # heuristic intent + ranking engine
    fit.ts                   # mm → UK/EU/US size conversion
    auth.ts  db.ts  products.ts
prisma/
  schema.prisma  seed.ts     # catalog of Indian footwear + retailer offers
```

---

## 🛣️ Roadmap
- Replace seed catalog with live retailer feeds / affiliate APIs.
- Real-time price scraping + availability.
- On-device foot scanning with AR depth for higher accuracy.
- Trained VTON model for photorealistic shoe try-on.
- Global expansion (US/EU sizing charts already supported in `lib/fit.ts`).

---
_© Upanah.AI — Made in India 🇮🇳. Prices & availability are indicative; buying happens on retailer sites._
