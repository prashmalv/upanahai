/**
 * Import real listings, with real prices, from brands' own storefronts.
 *
 *   npx tsx scripts/import-brand-catalog.ts [--per-brand 30] [--dry]
 *
 * WHY THIS EXISTS
 *
 * The catalog started as a demo seed, and the seed invented everything that
 * mattered: "4.4 stars from 1,820 reviews" on a shoe two people had reviewed,
 * "Amazon.in ₹3,499" with amazon.in's home page as the link. Publishing that —
 * on the page and, worse, as structured data a search engine can render — is the
 * exact accuracy problem this platform claims to solve for shoppers.
 *
 * The fix is not to drop price comparison. Comparing prices in one place is the
 * point of the site. The fix is for the prices to be real, and fourteen of the
 * brands in our directory publish a machine-readable product feed on their own
 * store: real title, real price, real product URL, the brand's own photograph of
 * its own product.
 *
 * WHAT THIS SCRIPT WILL NOT DO
 *
 * - It does not invent attributes. archSupport, cushioning, grip and
 *   breathability stay 0, meaning unknown, because a feed does not tell us how
 *   much arch support a shoe has and a plausible-looking 3 is a claim.
 * - It does not invent ratings. rating and reviewCount stay 0 until somebody
 *   reviews the product here.
 * - It does not import accessories. A belt is not footwear, and this site shows
 *   footwear only.
 * - It does not touch the seeded rows. Removing those is a separate, explicit
 *   step (--drop-seed) so that an import can never silently empty the catalog.
 */
import { PrismaClient } from "@prisma/client";
import { BRAND_DIRECTORY } from "../src/lib/brandDirectory";

const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry a write that failed transiently.
 *
 * The database is SQLite on an SMB mount, and on App Service a restart overlaps
 * the old container with the new one — so for a few seconds two processes have the
 * file open and writes come back as `SqliteError: disk I/O error`. That killed a
 * production import two brands in, leaving a half-real catalog with the invented
 * rows still in it. The error is transient by nature, so the right response is to
 * wait and try again, not to give up in the middle of a job that has no safe
 * halfway point.
 */
async function resilient<T>(what: string, fn: () => Promise<T>, tries = 8): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String((e as Error).message || "");
      const transient = /disk I\/O error|database is locked|SQLITE_BUSY/i.test(msg);
      if (!transient || attempt >= tries) throw e;
      console.log(`    retry ${attempt} (${what}): ${msg.slice(0, 60)}`);
      await sleep(800 * attempt);
    }
  }
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const arg = (flag: string, fallback: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const PER_BRAND = Number(arg("--per-brand", "30"));
const DRY = process.argv.includes("--dry");
const DROP_SEED = process.argv.includes("--drop-seed");

/** Brands whose own store publishes a product feed, with the store's display name. */
const SOURCES: { brand: string; origin: string; storeName: string }[] = [
  { brand: "Campus", origin: "https://campusshoes.com", storeName: "Campus store" },
  { brand: "Relaxo", origin: "https://relaxofootwear.com", storeName: "Relaxo store" },
  { brand: "Paragon", origin: "https://paragonfootwear.com", storeName: "Paragon store" },
  { brand: "Red Chief", origin: "https://redchief.in", storeName: "Red Chief store" },
  { brand: "Bacca Bucci", origin: "https://baccabucci.com", storeName: "Bacca Bucci store" },
  { brand: "Walkaroo", origin: "https://www.walkaroo.in", storeName: "Walkaroo store" },
  { brand: "Neeman's", origin: "https://neemans.com", storeName: "Neeman's store" },
  { brand: "Liberty", origin: "https://www.libertyshoesonline.com", storeName: "Liberty store" },
  { brand: "Khadim's", origin: "https://www.khadims.com", storeName: "Khadim's store" },
  { brand: "Fila", origin: "https://fila.co.in", storeName: "Fila store" },
  { brand: "Birkenstock", origin: "https://www.birkenstock.in", storeName: "Birkenstock store" },
  { brand: "Tresmode", origin: "https://www.tresmode.com", storeName: "Tresmode store" },
  { brand: "Alberto Torresi", origin: "https://www.albertotorresi.com", storeName: "Alberto Torresi store" },
  { brand: "Clarks", origin: "https://clarks.in", storeName: "Clarks store" }
];

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  product_type?: string;
  tags?: string[] | string;
  variants?: { price?: string; compare_at_price?: string | null; available?: boolean; sku?: string }[];
  images?: { src?: string }[];
  options?: { name?: string; values?: string[] }[];
};

/** Words that mean "this is not footwear". A belt in a shoe directory is a bug. */
const NOT_FOOTWEAR = [
  "belt", "wallet", "sock", "socks", "bag", "backpack", "cap", "hat", "tshirt",
  "t-shirt", "shirt", "jacket", "trouser", "short", "watch", "perfume", "deodorant",
  "care kit", "shoe care", "polish", "insole", "lace", "laces", "mask", "gift card",
  "gift voucher", "voucher", "sunglass", "jewellery", "towel", "cleaner", "cleaning",
  "keychain", "accessory", "accessories", "spray", "brush", "shoe tree", "umbrella"
];

/** Our categories, in the order we prefer to match them. */
const CATEGORY_RULES: { cat: string; words: string[] }[] = [
  { cat: "running", words: ["running", "runner", "marathon", "jogging"] },
  { cat: "sports", words: ["sports", "training", "gym", "football", "basketball", "badminton", "cricket", "trekking", "hiking"] },
  { cat: "formal", words: ["formal", "oxford", "derby", "brogue", "monk", "office"] },
  { cat: "orthopedic", words: ["orthopedic", "orthopaedic", "diabetic", "comfort", "arch"] },
  { cat: "sandals", words: ["sandal", "slipper", "flip flop", "flip-flop", "chappal", "clog", "slide", "thong", "mule"] },
  { cat: "walking", words: ["walking", "walk"] },
  { cat: "casual", words: ["casual", "sneaker", "loafer", "canvas", "boot", "shoe"] }
];

function textOf(p: ShopifyProduct): string {
  const tags = Array.isArray(p.tags) ? p.tags.join(" ") : p.tags || "";
  return `${p.title} ${p.product_type || ""} ${tags}`.toLowerCase();
}

/**
 * Is this footwear, or an accessory the store also sells?
 *
 * Judged on the title and product type only, and on whole words. Both details are
 * scars. Searching the whole tag soup threw away 239 of Birkenstock's 250 listings
 * because their tags describe the footbed and the word "insole" appears in every
 * one — the sandals were being rejected for explaining what they are made of. And
 * substring matching means "hat" hides inside "that" and "short" inside
 * "shorts-free". Titles are what a person reads; that is what we filter on.
 */
function isFootwear(p: ShopifyProduct): boolean {
  const t = `${p.title} ${p.product_type || ""}`.toLowerCase();
  return !NOT_FOOTWEAR.some((w) =>
    new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(t)
  );
}

/**
 * Which of our categories this listing belongs to.
 *
 * Text first. When a feed gives nothing to go on — Birkenstock's product_type is
 * the model name and its tags are shoe sizes, so "Arizona Natural Leather" matches
 * no category word at all — fall back to what our own directory records that brand
 * making. That file is checked by hand and says Birkenstock makes sandals; using it
 * is using knowledge we have rather than guessing, and it is why a brand whose feed
 * is uninformative is not silently dropped.
 */
function categoryOf(p: ShopifyProduct, brand: string): string {
  const t = textOf(p);
  for (const r of CATEGORY_RULES) if (r.words.some((w) => t.includes(w))) return r.cat;
  const dir = BRAND_DIRECTORY.find((b) => b.name === brand);
  const OURS = new Set(["running", "sports", "formal", "orthopedic", "sandals", "walking", "casual"]);
  const fromDirectory = dir?.categories.find((c) => OURS.has(c as string));
  if (fromDirectory) return fromDirectory === "comfort" ? "orthopedic" : (fromDirectory as string);
  return "casual";
}

function genderOf(p: ShopifyProduct): string {
  const t = textOf(p);
  const kids = ["kid", "kids", "boy", "girl", "child", "children", "junior", "infant"];
  if (kids.some((w) => new RegExp(`\\b${w}`).test(t))) return "kids";
  const women = ["women", "woman", "ladies", "female", "girls"];
  const men = ["men", "man", "gents", "male", "boys"];
  const w = women.some((x) => t.includes(x));
  // "women" contains "men", so men only counts when women did not match.
  const m = !w && men.some((x) => t.includes(x));
  if (w) return "women";
  if (m) return "men";
  return "unisex";
}

/** The brand's own copy, stripped of markup and cut to a sentence or two. */
function describe(p: ShopifyProduct, brand: string, category: string): string {
  const raw = (p.body_html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (raw.length > 40) {
    const cut = raw.slice(0, 240);
    const end = cut.lastIndexOf(". ");
    return (end > 80 ? cut.slice(0, end + 1) : cut).trim();
  }
  // No usable copy: describe only what we can see, and say where it came from.
  return `${p.title} — ${category} footwear listed by ${brand} on their own store.`;
}

function tagsOf(p: ShopifyProduct, category: string): string {
  const raw = Array.isArray(p.tags) ? p.tags : (p.tags || "").split(",");
  const clean = raw
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t && t.length < 24 && !/^\d+$/.test(t));
  return Array.from(new Set([category, ...clean])).slice(0, 14).join(",");
}

/**
 * The colourway, in the brand's own words.
 *
 * Several brands publish each colour as its own listing with an identical title —
 * Relaxo has three "Shoes for Men SM-1120", Bacca Bucci four "Discovery Vulcan" —
 * so without this the catalog carries pages that are indistinguishable to a
 * shopper and duplicate titles to a search engine. Whatever the brand puts in its
 * Color option is used verbatim, even when that is a code like DGRT: their code is
 * a fact, and inventing "Dark Grey" from it would not be.
 */
function colorOf(p: ShopifyProduct): string {
  const opt = (p.options || []).find((o) => /colou?r/i.test(o.name || ""));
  const v = (opt?.values || []).find((x) => x && x.trim());
  return (v || "").trim().slice(0, 32);
}

/**
 * A URL slug that stays unique after truncation.
 *
 * Cutting at 90 characters lost the end of the handle, and the end is exactly
 * where the distinguishing part lives: Paragon's handles run to a hundred-odd
 * characters of marketing copy and finish with the colour code, so three sandals
 * became one slug and silently overwrote each other — eleven listings vanished
 * that way. Keep the head for readability and the tail because it is the part that
 * differs.
 */
function slugOf(brand: string, handle: string): string {
  const full = `${brand}-${handle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (full.length <= 90) return full;
  const tail = full.slice(-24).replace(/^-/, "");
  return `${full.slice(0, 90 - tail.length - 1)}-${tail}`;
}

async function fetchFeed(origin: string): Promise<ShopifyProduct[]> {
  const out: ShopifyProduct[] = [];
  for (let page = 1; page <= 2; page++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 30_000);
    try {
      const res = await fetch(`${origin}/products.json?limit=250&page=${page}`, {
        signal: ctl.signal,
        headers: { "User-Agent": UA, Accept: "application/json" }
      });
      if (!res.ok) break;
      const body = (await res.json()) as { products?: ShopifyProduct[] };
      const ps = body.products ?? [];
      out.push(...ps);
      if (ps.length < 250) break;
    } catch {
      break;
    } finally {
      clearTimeout(t);
    }
  }
  return out;
}

async function main() {
  const known = new Set(BRAND_DIRECTORY.map((b) => b.name));
  const now = new Date();
  // Page titles already claimed, so no two listings share one.
  const namesSeen = new Set<string>();
  // Slugs written this run, and the brands whose feed we actually reached. A
  // listing that has dropped out of a brand's feed will never have its price
  // refreshed again, so it goes — but only for brands we successfully fetched,
  // or one unreachable store would wipe its own section of the catalog.
  const seenSlugs = new Set<string>();
  const fetchedBrands = new Set<string>();
  let imported = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const src of SOURCES) {
    if (!known.has(src.brand)) {
      failures.push(`${src.brand}: not in the brand directory`);
      continue;
    }
    const feed = await fetchFeed(src.origin);
    if (feed.length === 0) {
      failures.push(`${src.brand}: feed returned nothing`);
      console.log(`  skip   ${src.brand.padEnd(16)} feed unavailable`);
      continue;
    }

    const usable = feed.filter((p) => {
      const price = Number((p.variants ?? [{}])[0]?.price ?? 0);
      const img = p.images?.[0]?.src;
      return isFootwear(p) && price > 0 && !!img;
    });
    skipped += feed.length - usable.length;

    fetchedBrands.add(src.brand);

    const take = usable.slice(0, PER_BRAND);
    // Collected first, written once. Writing each listing as it is built meant
    // roughly 840 separate write transactions against a SQLite file on an SMB
    // share, while the live app was writing page views to the same file — and the
    // share's locking gives up under that, with "disk I/O error", partway through.
    // One transaction per brand takes the write lock fourteen times instead.
    const pending: { data: any; offer: any }[] = [];
    for (const p of take) {
      const price = Math.round(Number(p.variants![0].price));
      const category = categoryOf(p, src.brand);
      const color = colorOf(p);
      const slug = slugOf(src.brand, p.handle);
      const url = `${src.origin}/products/${p.handle}`;
      const data = {
        brand: src.brand,
        // Disambiguate only when it is needed: a shopper reading one listing does
        // not want a colour code bolted onto the name for no reason. Fall through
        // to the handle when the colour does not separate them either — Campus
        // publishes two "NERLO White Women's Running Shoes", both in White.
        name: (() => {
          const base = p.title.trim().slice(0, 140);
          const taken = (n: string) => namesSeen.has(`${src.brand}|${n}`.toLowerCase());
          const claim = (n: string) => {
            namesSeen.add(`${src.brand}|${n}`.toLowerCase());
            return n;
          };
          if (!taken(base)) return claim(base);
          const withColor = color ? `${base} (${color})` : "";
          if (withColor && !taken(withColor)) return claim(withColor);
          // The brand's own SKU, minus the trailing size. Campus publishes three
          // "NERLO White Women's Running Shoes" all in White, and their SKUs are
          // what actually tells them apart: OFWHT-WHTPPR, WHITE-YUCCA, WHT-PNKDWOOD.
          const sku = (p.variants?.[0]?.sku || "").replace(/-\d+$/, "").trim();
          const withSku = sku ? `${base} (${sku})` : "";
          if (withSku && !taken(withSku)) return claim(withSku);
          for (let n = 2; ; n++) {
            const numbered = `${base} (${n})`;
            if (!taken(numbered)) return claim(numbered);
          }
        })(),
        slug,
        gender: genderOf(p),
        category,
        description: describe(p, src.brand, category),
        imageUrl: p.images![0].src!,
        colorway: color,
        basePrice: price,
        // Left at zero on purpose: see the header. No invented ratings, no
        // invented support scores.
        rating: 0,
        reviewCount: 0,
        tags: tagsOf(p, category),
        archSupport: 0,
        cushioning: 0,
        grip: 0,
        breathability: 0,
        suitsPersonas: "general",
        sourcedFrom: src.storeName,
        sourcedAt: now
      };

      pending.push({
        data,
        offer: {
          retailer: src.storeName,
          price,
          url,
          inStock: (p.variants![0].available ?? true) !== false,
          deliveryDays: 0,
          retailerRating: 0,
          capturedAt: now
        }
      });
    }
    if (!DRY && pending.length) {
      await resilient(`write ${src.brand}`, () =>
        prisma.$transaction(
          pending.flatMap((row) => [
            prisma.product.upsert({
              where: { slug: row.data.slug },
              update: row.data,
              create: row.data
            }),
            // Offers are replaced rather than appended, so a re-run cannot stack
            // up yesterday's price beside today's.
            prisma.offer.deleteMany({ where: { product: { slug: row.data.slug } } }),
            prisma.offer.create({
              data: { ...row.offer, product: { connect: { slug: row.data.slug } } }
            })
          ])
        )
      );
    }
    imported += pending.length;
    for (const row of pending) seenSlugs.add(row.data.slug);

    console.log(
      `  ok     ${src.brand.padEnd(16)} ${pending.length} imported ` +
        `(${usable.length} usable of ${feed.length} in feed)`
    );
    // Let the live app get a turn at the file before the next brand.
    if (!DRY) await sleep(600);
  }

  if (!DRY && fetchedBrands.size > 0) {
    const stale = await resilient("find stale", () =>
      prisma.product.findMany({
        where: {
          brand: { in: Array.from(fetchedBrands) },
          NOT: { sourcedFrom: "" },
          slug: { notIn: Array.from(seenSlugs) }
        },
        select: { id: true, slug: true, wishlist: { select: { id: true } }, feedback: { select: { id: true } } }
      })
    );
    // Anything a shopper has saved or reviewed stays: their wishlist should not
    // empty itself because a brand reshuffled its storefront.
    const removable = stale.filter((x) => x.wishlist.length === 0 && x.feedback.length === 0);
    if (removable.length) {
      const ids = removable.map((x) => x.id);
      await resilient("prune stale", () =>
        prisma.$transaction([
          prisma.offer.deleteMany({ where: { productId: { in: ids } } }),
          prisma.product.deleteMany({ where: { id: { in: ids } } })
        ])
      );
    }
    const kept = stale.length - removable.length;
    if (stale.length) {
      console.log(
        `\n  pruned ${removable.length} listing(s) no longer in a brand's feed` +
          (kept ? `, kept ${kept} that a shopper had saved or reviewed` : "")
      );
    }
  }

  if (DROP_SEED && !DRY) {
    const seeded = await resilient("find seeded", () =>
      prisma.product.findMany({ where: { sourcedFrom: "" }, select: { id: true } })
    );
    const ids = seeded.map((s) => s.id);
    if (ids.length) {
      await prisma.$transaction([
        prisma.offer.deleteMany({ where: { productId: { in: ids } } }),
        prisma.wishlist.deleteMany({ where: { productId: { in: ids } } }),
        prisma.feedback.deleteMany({ where: { productId: { in: ids } } }),
        prisma.product.deleteMany({ where: { id: { in: ids } } })
      ]);
    }
    console.log(`\n  removed ${ids.length} seeded listings and everything attached to them`);
  }

  const total = await prisma.product.count();
  const real = await prisma.product.count({ where: { NOT: { sourcedFrom: "" } } });
  console.log(
    `\n${imported} listings ${DRY ? "would be imported" : "imported"} · ` +
      `${skipped} feed entries skipped as not footwear or unpriced`
  );
  console.log(`catalog now: ${total} products, ${real} from a brand's own store`);
  if (failures.length) {
    console.log("\nsources that did not yield anything:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
