/**
 * Refresh each brand's own best-seller list from the brand's own storefront.
 *
 *   npx tsx scripts/refresh-brand-picks.ts
 *
 * WHY THIS IS THE ONLY HONEST "POPULAR RIGHT NOW" WE CAN SHOW
 *
 * Nobody publishes footwear sales figures for India. A "top 10 selling shoes"
 * list would therefore be fabricated, and the first brand to ask where the number
 * came from would be entitled to an answer we don't have. But several brands
 * publish a best-seller collection on their own store — that is *their* claim
 * about *their* products, and quoting it with attribution and a date is ordinary,
 * checkable reporting.
 *
 * RULES THIS SCRIPT KEEPS
 *
 * - Only collections the brand itself labels as best-selling. Not "best casual
 *   shoes for men", which is an SEO category page dressed as a recommendation —
 *   Neeman's and Walkaroo have those and no real best-seller list, so they are
 *   not in the list below.
 * - Names, prices and links only. No images: a product photograph is the brand's
 *   to publish, and hotlinking their CDN to decorate our pages is both a
 *   copyright question and a cost we would be imposing on them.
 * - A failed fetch changes nothing. Stale rows are better than empty ones, and
 *   the UI shows the fetch date so staleness is the reader's to judge.
 * - Prices move. What we store is what the brand listed at fetch time, and the
 *   UI says so rather than implying a live quote.
 */
import { PrismaClient } from "@prisma/client";
import { BRAND_DIRECTORY } from "../src/lib/brandDirectory";

const prisma = new PrismaClient();

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Brand → the collection on its own store that the brand calls its best sellers.
 * Every handle here was read from that store's public collection list; if a brand
 * has no such collection it is absent rather than approximated.
 */
const SOURCES: { brand: string; origin: string; handle: string }[] = [
  { brand: "Campus", origin: "https://campusshoes.com", handle: "campus-best-sellers" },
  { brand: "Relaxo", origin: "https://relaxofootwear.com", handle: "bestsellers" },
  { brand: "Paragon", origin: "https://paragonfootwear.com", handle: "best-sellers-mens" },
  { brand: "Red Chief", origin: "https://redchief.in", handle: "red-chief-best-sellers" },
  { brand: "Bacca Bucci", origin: "https://baccabucci.com", handle: "bacca-bucci-best-seller-collection" }
];

const PER_BRAND = 8;

type ShopifyProduct = {
  title: string;
  handle: string;
  variants?: { price?: string }[];
};

async function fetchPicks(origin: string, handle: string) {
  const url = `${origin}/collections/${handle}/products.json?limit=${PER_BRAND}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" }
    });
    if (!res.ok) return { error: `HTTP ${res.status}`, products: [] as ShopifyProduct[] };
    const body = (await res.json()) as { products?: ShopifyProduct[] };
    return { error: "", products: body.products ?? [] };
  } catch (e) {
    return { error: (e as Error).name === "AbortError" ? "timed out" : (e as Error).message,
             products: [] as ShopifyProduct[] };
  } finally {
    clearTimeout(t);
  }
}

/** Collection titles as we quote them, derived from the handle the brand chose. */
function collectionLabel(handle: string) {
  return handle
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMens\b/, "Men's");
}

async function main() {
  const known = new Set(BRAND_DIRECTORY.map((b) => b.name));
  let written = 0;
  const failures: string[] = [];

  for (const src of SOURCES) {
    if (!known.has(src.brand)) {
      // A source for a brand we don't list would show a shopper picks they cannot
      // then read reviews for. Fail loudly rather than publish an orphan.
      failures.push(`${src.brand}: not in the brand directory`);
      continue;
    }

    const { error, products } = await fetchPicks(src.origin, src.handle);
    if (error || products.length === 0) {
      failures.push(`${src.brand}: ${error || "collection returned no products"}`);
      console.log(`  keep-existing  ${src.brand.padEnd(14)} ${error || "empty response"}`);
      continue;
    }

    const rows = products.slice(0, PER_BRAND).map((p, i) => ({
      brand: src.brand,
      title: p.title.trim(),
      url: `${src.origin}/products/${p.handle}`,
      priceInr: Math.round(Number(p.variants?.[0]?.price ?? 0)) || 0,
      position: i,
      collectionName: collectionLabel(src.handle),
      fetchedAt: new Date()
    }));

    // Replace this brand's rows in one transaction: a half-updated list would
    // mix two fetches under one date.
    await prisma.$transaction([
      prisma.brandPick.deleteMany({ where: { brand: src.brand } }),
      prisma.brandPick.createMany({ data: rows })
    ]);
    written += rows.length;
    console.log(`  ok             ${src.brand.padEnd(14)} ${rows.length} picks from "${rows[0].collectionName}"`);
  }

  const total = await prisma.brandPick.count();
  console.log(`\n${written} picks refreshed · ${total} stored across ${SOURCES.length} sources`);
  if (failures.length) {
    console.log("\nSources that did not refresh (previous rows kept):");
    for (const f of failures) console.log(`  - ${f}`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
