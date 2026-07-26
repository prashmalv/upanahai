/**
 * Opt-in catalog image audit: does each product picture actually show footwear
 * of the stated category?
 *
 *   npx tsx prisma/audit-images.ts          # report only
 *   npx tsx prisma/audit-images.ts --hide   # also hide the ones that aren't footwear
 *
 * Uses the project's own Azure OpenAI vision deployment, so it costs tokens —
 * which is why it is NOT part of startup.sh. The cheap, always-on check is
 * prisma/validate-images.ts (does the URL serve an image at all).
 *
 * Note it verifies *category*, not *brand*. Confirming that a picture really
 * shows the brand it claims needs first-party product imagery from the brand or
 * retailer feed; free stock photos cannot satisfy that.
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

const SYSTEM =
  "You audit catalog images for a footwear marketplace. Return ONLY JSON: " +
  '{"isFootwear":bool,"matchesCategory":bool,"subject":"short description of what is in the image"}. ' +
  "matchesCategory is whether the footwear shown plausibly matches the stated category.";

type Verdict = { isFootwear: boolean; matchesCategory: boolean; subject: string };

async function classify(imageUrl: string, label: string, category: string): Promise<Verdict | null> {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "UpanahAI/1.0 (catalog image audit)" }
  });
  if (!res.ok) return null;
  const ctype = res.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");

  const body = {
    // GPT-5 class deployments require max_completion_tokens, and reasoning
    // tokens are billed against it — hence the generous budget.
    max_completion_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: `Stated product: "${label}", category "${category}".` },
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
    console.error(
      "[audit] AZURE_OPENAI_ENDPOINT / _API_KEY / _VISION_DEPLOYMENT must be set."
    );
    process.exitCode = 1;
    return;
  }
  const hide = process.argv.includes("--hide");

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, brand: true, name: true, category: true, imageUrl: true },
    orderBy: { brand: "asc" }
  });

  const problems: { slug: string; label: string; why: string; subject: string }[] = [];

  for (const p of products) {
    const label = `${p.brand} ${p.name}`;
    let v: Verdict | null;
    try {
      v = await classify(p.imageUrl, label, p.category);
    } catch (e) {
      console.log(`  ERR      ${label} — ${(e as Error).message}`);
      continue;
    }
    if (!v) {
      console.log(`  DEAD     ${label} — image did not load`);
      problems.push({ slug: p.slug, label, why: "image did not load", subject: "" });
      continue;
    }
    if (!v.isFootwear) {
      console.log(`  NOTSHOE  ${label} — actually: ${v.subject}`);
      problems.push({ slug: p.slug, label, why: "not footwear", subject: v.subject });
      if (hide) {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageOk: false, imageNote: `not footwear: ${v.subject}`.slice(0, 180) }
        });
      }
    } else if (!v.matchesCategory) {
      console.log(`  MISMATCH ${label} (${p.category}) — shows: ${v.subject}`);
      problems.push({
        slug: p.slug,
        label,
        why: `does not match category ${p.category}`,
        subject: v.subject
      });
    } else {
      console.log(`  OK       ${label} — ${v.subject}`);
    }
  }

  console.log(`\n[audit] ${products.length} checked · ${problems.length} problems`);
  for (const p of problems) console.log(`  - ${p.slug}: ${p.why}${p.subject ? ` (${p.subject})` : ""}`);
  if (problems.length && !hide) {
    console.log("\nRe-run with --hide to take the not-footwear ones out of every listing.");
  }
}

main()
  .catch((e) => {
    console.error("[audit] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
