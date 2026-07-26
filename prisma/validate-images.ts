/**
 * Marks products whose image cannot be displayed, so they drop out of every
 * listing instead of rendering as an empty box.
 *
 * Runs on every boot from startup.sh (a handful of HTTP requests, seconds) and
 * can be run by hand after editing the catalog. It only checks that the URL
 * serves a real image — deciding whether the picture shows the *right* footwear
 * needs the vision audit (see prisma/audit-images.ts), which costs tokens and is
 * therefore opt-in.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TIMEOUT_MS = 12_000;
const MIN_BYTES = 2_000; // anything smaller is a placeholder or an error page

async function check(url: string): Promise<{ ok: boolean; note: string }> {
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, note: "missing or invalid url" };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    // GET, not HEAD: several CDNs answer HEAD with 405 while serving GET fine.
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "UpanahAI/1.0 (catalog image validation)" }
    });
    if (!res.ok) return { ok: false, note: `HTTP ${res.status}` };

    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return { ok: false, note: `content-type ${type || "unknown"}` };

    const bytes = (await res.arrayBuffer()).byteLength;
    if (bytes < MIN_BYTES) return { ok: false, note: `only ${bytes} bytes` };

    return { ok: true, note: "" };
  } catch (err) {
    const e = err as Error;
    return { ok: false, note: e.name === "AbortError" ? "timed out" : e.message.slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, brand: true, name: true, imageUrl: true, imageOk: true }
  });

  let hidden = 0;
  let restored = 0;

  // Small catalog — a bounded concurrency of 5 keeps boot fast without
  // hammering the image host.
  const queue = [...products];
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift()!;
      const { ok, note } = await check(p.imageUrl);
      if (ok !== p.imageOk || !ok) {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageOk: ok, imageNote: note, imageCheckedAt: new Date() }
        });
      } else {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageCheckedAt: new Date() }
        });
      }
      if (!ok) {
        hidden++;
        console.log(`[images] HIDDEN  ${p.brand} ${p.name} — ${note}`);
      } else if (!p.imageOk) {
        restored++;
        console.log(`[images] RESTORED ${p.brand} ${p.name}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));

  const visible = await prisma.product.count({ where: { imageOk: true } });
  console.log(
    `[images] checked ${products.length} · ${visible} displayable · ` +
      `${hidden} hidden${restored ? ` · ${restored} restored` : ""}`
  );
}

main()
  .catch((e) => {
    // Never fail the boot over image validation.
    console.error("[images] validation failed:", e);
  })
  .finally(() => prisma.$disconnect());
