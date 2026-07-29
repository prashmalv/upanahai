/**
 * Link health for the brand directory.
 *
 *   npx tsx scripts/check-brand-links.ts
 *
 * A directory's whole value is that its links work. Link rot is the failure mode
 * that quietly destroys it: a brand changes domain, an entry starts pointing at a
 * parked domain, and the site is sending customers nowhere. Run this on a
 * schedule and before any launch push.
 *
 * Large brands (Nike, Adidas, Asics, Vans, New Balance, Dr. Martens) answer bots
 * with 403 from Cloudflare/Akamai. That is not rot, so a 403 from the brand's own
 * host passes. What does NOT pass is a response that looks like a domain-parking
 * or for-sale page — that is exactly how a directory entry goes bad without
 * anyone noticing, and one candidate was caught that way while building this.
 */
import { BRAND_DIRECTORY } from "../src/lib/brandDirectory";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Substrings that mean "this domain is parked / for sale", not a brand store. */
const PARKED_SIGNS = [
  "sedo.com",
  "domain is for sale",
  "buy this domain",
  "dan.com",
  "afternic",
  "hugedomains",
  "parkingcrew",
  "this domain may be for sale",
  "/lander?"
];

type Result = {
  brand: string;
  url: string;
  status: number;
  finalUrl: string;
  verdict: "ok" | "bot-blocked" | "PARKED" | "DEAD" | "REDIRECTED-OFFSITE";
  detail?: string;
};

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Same registrable-ish domain, tolerating www and country/store subdomains. */
function relatedHost(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const parts = (h: string) => h.split(".").filter(Boolean);
  const core = (h: string) => parts(h).slice(-3).join(".");
  return core(a).includes(parts(b)[0]) || core(b).includes(parts(a)[0]);
}

async function check(brand: string, url: string): Promise<Result> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30_000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" }
    });
    const finalUrl = res.url || url;
    const body = (await res.text().catch(() => "")).slice(0, 4000).toLowerCase();

    if (PARKED_SIGNS.some((p) => body.includes(p) || finalUrl.toLowerCase().includes(p))) {
      return { brand, url, status: res.status, finalUrl, verdict: "PARKED",
               detail: "response looks like a parked / for-sale domain" };
    }
    if (!relatedHost(hostOf(finalUrl), hostOf(url))) {
      return { brand, url, status: res.status, finalUrl, verdict: "REDIRECTED-OFFSITE",
               detail: `ends up on ${hostOf(finalUrl)}` };
    }
    if (res.status === 403 || res.status === 405 || res.status === 423) {
      return { brand, url, status: res.status, finalUrl, verdict: "bot-blocked" };
    }
    if (!res.ok) {
      return { brand, url, status: res.status, finalUrl, verdict: "DEAD",
               detail: `HTTP ${res.status}` };
    }
    return { brand, url, status: res.status, finalUrl, verdict: "ok" };
  } catch (e) {
    return { brand, url, status: 0, finalUrl: url, verdict: "DEAD",
             detail: (e as Error).name === "AbortError" ? "timed out" : (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log(`Checking ${BRAND_DIRECTORY.length} brand links...\n`);

  const results: Result[] = [];
  const queue = [...BRAND_DIRECTORY];
  const worker = async () => {
    while (queue.length) {
      const b = queue.shift()!;
      const r = await check(b.name, b.url);
      results.push(r);
      const mark =
        r.verdict === "ok" ? "ok        "
        : r.verdict === "bot-blocked" ? "bot-block "
        : `${r.verdict} `;
      console.log(
        `  ${mark} ${r.brand.padEnd(16)} ${String(r.status).padEnd(4)} ${r.finalUrl}` +
          (r.detail ? `  — ${r.detail}` : "")
      );
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  const broken = results.filter(
    (r) => r.verdict === "DEAD" || r.verdict === "PARKED" || r.verdict === "REDIRECTED-OFFSITE"
  );
  const blocked = results.filter((r) => r.verdict === "bot-blocked");

  console.log(
    `\n${results.length} checked · ${results.length - broken.length} healthy ` +
      `(${blocked.length} bot-blocked but real) · ${broken.length} need attention`
  );
  if (broken.length) {
    console.log("\nFix or remove these entries in src/lib/brandDirectory.ts:");
    for (const b of broken) console.log(`  - ${b.brand}: ${b.verdict} — ${b.detail} (${b.url})`);
    process.exitCode = 1;
  }

  // Deliberately no per-brand "this store blocks us" flag. Whether a WAF refuses
  // depends on the HTTP client: curl is refused by Nike, Asics, Adidas, Vans and
  // New Balance where Node's fetch gets through, and Dr. Martens does the
  // opposite. Two runs of this script disagree on several brands, so a flag
  // derived from it would show shoppers a warning about a store that works.
  // bot-blocked is reported above for information and never fails the run.
}

main();
