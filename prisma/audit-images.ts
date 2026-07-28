/**
 * Catalog image audit — is each picture (a) footwear, (b) the right category,
 * and (c) safe to publish under the brand it is listed against?
 *
 *   npx tsx prisma/audit-images.ts            # report only
 *   npx tsx prisma/audit-images.ts --hide     # hide the unsafe ones
 *
 * WHAT COUNTS AS UNSAFE, AND WHY
 *
 * The legal and reputational risk is not "the photo isn't the exact model" — it
 * is showing a *competitor's identifiable product* as this brand's. A plain shoe
 * with no visible logo is defensible as illustrative; an Adidas three-stripe boot
 * sitting on a "Nike Mercurial" listing is not, and it is the kind of thing the
 * brand's own team notices first.
 *
 * So the rule is proportionate:
 *   hide  — the image is not footwear at all
 *   hide  — a brand mark is identifiable AND it isn't the listed brand
 *   keep  — no identifiable brand mark (generic shoe), or the mark matches
 *   warn  — footwear but wrong category (cosmetic; reported, not hidden)
 *
 * Uses the project's own Azure OpenAI vision deployment, so it costs tokens and
 * is deliberately NOT part of startup.sh. The cheap always-on check is
 * prisma/validate-images.ts (does the URL serve an image at all).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ENDPOINT = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/$/, "");
const KEY = process.env.AZURE_OPENAI_API_KEY || "";
const DEPLOYMENT =
  process.env.AZURE_OPENAI_VISION_DEPLOYMENT ||
  process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ||
  "";
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

const SYSTEM = `You audit catalog images for a footwear marketplace that lists named brands.
Return ONLY JSON:
{
  "isFootwear": boolean,
  "matchesCategory": boolean,
  "visibleBrand": "the brand whose logo, wordmark or signature design is clearly identifiable in the image, or null if none is",
  "brandConfident": boolean,
  "subject": "short description of what is in the image"
}
Set visibleBrand only when a mark is genuinely identifiable — a Nike swoosh, adidas
three stripes, a Puma formstrip, a New Balance N, a Birkenstock cork footbed with
branding, a visible wordmark. A plain unbranded shoe must return null.
Do not guess a brand from styling alone.`;

type Verdict = {
  isFootwear: boolean;
  matchesCategory: boolean;
  visibleBrand: string | null;
  brandConfident: boolean;
  subject: string;
};

/** Same company, different spellings — don't flag these as mismatches. */
const ALIASES: Record<string, string[]> = {
  adidas: ["adidas originals", "adidas performance"],
  nike: ["nike sportswear", "jordan", "air jordan", "nike air"],
  puma: [],
  asics: ["asics tiger"],
  "new balance": ["nb"],
  skechers: [],
  crocs: [],
  birkenstock: [],
  clarks: ["clarks originals"],
  woodland: [],
  bata: ["bata comfit", "power", "north star"],
  metro: ["metro shoes"],
  campus: ["campus shoes"],
  "dr. scholl's": ["dr scholls", "dr. scholls", "scholl"]
};

function sameBrand(claimed: string, seen: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const c = norm(claimed);
  const s = norm(seen);
  if (!s) return true;
  if (c === s || s.includes(c) || c.includes(s)) return true;
  return (ALIASES[c] || []).some((a) => norm(a) === s || s.includes(norm(a)));
}

async function classify(imageUrl: string, brand: string, category: string): Promise<Verdict | null> {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "UpanahAI/1.0 (catalog image audit)" }
  });
  if (!res.ok) return null;
  const ctype = res.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");

  const body = {
    // GPT-5 class deployments need max_completion_tokens, and reasoning tokens
    // are billed against it — hence the generous budget.
    max_completion_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This image is published on a listing for "${brand}", category "${category}".`
          },
          { type: "image_url", image_url: { url: `data:${ctype};base64,${b64}` } }
        ]
      }
    ]
  };

  const r = await fetch(
    `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`,
    {
      method: "POST",
      headers: { "api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  if (!r.ok) throw new Error(`vision ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const out = await r.json();
  return JSON.parse(out.choices[0].message.content) as Verdict;
}

async function main() {
  if (!ENDPOINT || !KEY || !DEPLOYMENT) {
    console.error("[audit] AZURE_OPENAI_ENDPOINT / _API_KEY / _VISION_DEPLOYMENT must be set.");
    process.exitCode = 1;
    return;
  }
  const hide = process.argv.includes("--hide");

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, brand: true, name: true, category: true, imageUrl: true },
    orderBy: { brand: "asc" }
  });

  const unsafe: { label: string; why: string }[] = [];
  const warnings: { label: string; why: string }[] = [];
  let kept = 0;

  for (const p of products) {
    const label = `${p.brand} ${p.name}`;
    let v: Verdict | null;
    try {
      v = await classify(p.imageUrl, p.brand, p.category);
    } catch (e) {
      console.log(`  ERR      ${label} — ${(e as Error).message}`);
      continue;
    }
    if (!v) {
      console.log(`  DEAD     ${label} — image did not load`);
      unsafe.push({ label, why: "image did not load" });
      if (hide) await mark(p.id, false, "image did not load");
      continue;
    }

    const wrongBrand =
      !!v.visibleBrand && v.brandConfident && !sameBrand(p.brand, v.visibleBrand);

    if (!v.isFootwear) {
      console.log(`  NOTSHOE  ${label} — actually: ${v.subject}`);
      unsafe.push({ label, why: `not footwear (${v.subject})` });
      if (hide) await mark(p.id, false, `not footwear: ${v.subject}`);
    } else if (wrongBrand) {
      console.log(`  WRONGBRAND ${label} — image shows ${v.visibleBrand}: ${v.subject}`);
      unsafe.push({ label, why: `image shows ${v.visibleBrand}` });
      if (hide) {
        await mark(
          p.id,
          false,
          `shows ${v.visibleBrand}, listed as ${p.brand} — needs first-party imagery`
        );
      }
    } else if (!v.matchesCategory) {
      console.log(`  CATEGORY ${label} (${p.category}) — shows: ${v.subject}`);
      warnings.push({ label, why: `does not look like ${p.category}` });
      kept++;
    } else {
      const mark2 = v.visibleBrand ? ` [${v.visibleBrand}]` : " [unbranded]";
      console.log(`  OK       ${label}${mark2}`);
      // Clear any previous block so a corrected image comes back automatically.
      if (hide) await mark(p.id, true, "");
      kept++;
    }
  }

  const visible = await prisma.product.count({ where: { imageOk: true, imageBrandSafe: true } });
  console.log(
    `\n[audit] ${products.length} checked · ${kept} publishable · ` +
      `${unsafe.length} unsafe · ${warnings.length} cosmetic warnings`
  );
  if (unsafe.length) {
    console.log("\nUnsafe to publish under the listed brand:");
    for (const u of unsafe) console.log(`  - ${u.label}: ${u.why}`);
  }
  if (warnings.length) {
    console.log("\nCosmetic only (kept — no competitor mark shown):");
    for (const w of warnings) console.log(`  - ${w.label}: ${w.why}`);
  }
  console.log(`\n[audit] ${visible} products currently displayable.`);
  if (unsafe.length && !hide) {
    console.log("Re-run with --hide to take the unsafe ones out of every listing.");
  }
}

/**
 * Writes only `imageBrandSafe`. URL health is `imageOk`, owned by
 * prisma/validate-images.ts — this script must not touch it, or the two would
 * overwrite each other on every boot.
 */
function mark(id: string, brandSafe: boolean, note: string) {
  return prisma.product.update({
    where: { id },
    data: {
      imageBrandSafe: brandSafe,
      imageBrandNote: note.slice(0, 180),
      imageCheckedAt: new Date()
    }
  });
}

main()
  .catch((e) => {
    console.error("[audit] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
