import { prisma } from "@/lib/db";
import { BRAND_DIRECTORY, slugify } from "@/lib/brandDirectory";

/**
 * The public "what India is looking for" board.
 *
 * WHY THIS AND NOT "BEST SELLERS"
 *
 * Nobody publishes footwear sales figures for India, so a bestseller list here
 * would be invented — and the first brand to ask where the number came from would
 * be right to. What we do have is our own demand data: what shoppers searched
 * for, which brands they clicked through to, what they asked the community. That
 * is real, it is ours, and nobody else publishes it either.
 *
 * TWO RULES, BECAUSE A DEMAND BOARD IS EASY TO FAKE
 *
 * 1. A row is only shown once enough distinct people are behind it. One
 *    enthusiastic visitor searching "running shoes" eleven times must not become
 *    "India is looking for running shoes". Every count below counts *people*
 *    (distinct visitorId), not rows, and MIN_VOICES gates publication.
 * 2. The board never pads itself. If the data isn't there yet the caller is told
 *    so via `thin`, and the page shows something honest instead of a lonely bar
 *    chart implying we have traffic we don't have.
 */

/** Distinct people needed before a row is fit to publish. */
export const MIN_VOICES = 5;

/** How far back the public board looks. Long enough to accumulate, short enough to mean "now". */
export const PULSE_DAYS = 30;

export type PulseRow = { key: string; people: number };

/** Count distinct people per key, drop anything below the floor. */
function byPeople(
  rows: { key: string; who: string }[],
  min = MIN_VOICES
): PulseRow[] {
  const m = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.key) continue;
    (m.get(r.key) ?? m.set(r.key, new Set()).get(r.key)!).add(r.who || "anon");
  }
  return Array.from(m.entries())
    .map(([key, who]) => ({ key, people: who.size }))
    .filter((r) => r.people >= min)
    .sort((a, b) => b.people - a.people);
}

export type Pulse = {
  days: number;
  /** true when there isn't enough real data to fill the board yet. */
  thin: boolean;
  people: number;
  searches: number;
  categories: PulseRow[];
  brands: PulseRow[];
  needs: PulseRow[];
  audiences: PulseRow[];
  budgets: PulseRow[];
  queries: PulseRow[];
  /** Brands people actually clicked through to — intent, not just curiosity. */
  visited: PulseRow[];
  /** What the community is asking about, by title. */
  questions: { title: string; slug: string; answers: number }[];
  /** Demand we could not serve: searches that returned nothing. */
  unserved: PulseRow[];
};

export async function getPulse(days = PULSE_DAYS): Promise<Pulse> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [logs, visits, questions] = await Promise.all([
    prisma.searchLog.findMany({
      where: { createdAt: { gte: from } },
      select: {
        query: true, gender: true, category: true, brand: true,
        needs: true, maxPrice: true, resultCount: true, visitorId: true
      }
    }),
    prisma.event.findMany({
      where: { createdAt: { gte: from }, type: "brand_visit" },
      select: { meta: true, visitorId: true }
    }),
    prisma.question.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, title: true, _count: { select: { answers: true } } }
    })
  ]);

  const who = (v: string | null) => v || "anon";
  const people = new Set(logs.map((l) => who(l.visitorId))).size;

  const budgetBand = (p: number) =>
    p <= 1500 ? "Under ₹1,500"
    : p <= 3000 ? "₹1,500 – ₹3,000"
    : p <= 5000 ? "₹3,000 – ₹5,000"
    : p <= 10000 ? "₹5,000 – ₹10,000"
    : "Over ₹10,000";

  // Brand names are stored in the event meta as "brand=Nike;from=directory".
  const known = new Set(BRAND_DIRECTORY.map((b) => b.name));
  const visitRows = visits
    .map((v) => ({
      key: /brand=([^;]+)/.exec(v.meta)?.[1] ?? "",
      who: who(v.visitorId)
    }))
    .filter((r) => known.has(r.key));

  const categories = byPeople(logs.map((l) => ({ key: l.category, who: who(l.visitorId) })));
  const brands = byPeople(logs.map((l) => ({ key: l.brand, who: who(l.visitorId) })));
  const needs = byPeople(
    logs.flatMap((l) =>
      l.needs.split(",").map((n) => n.trim()).filter(Boolean)
        .map((key) => ({ key, who: who(l.visitorId) }))
    )
  );
  const audiences = byPeople(logs.map((l) => ({ key: l.gender, who: who(l.visitorId) })));
  const visited = byPeople(visitRows);

  return {
    days,
    // "Thin" means nothing at all cleared the people floor. It is deliberately
    // judged on the published rows rather than on raw row counts: five clicks from
    // one curious visitor is not five voices, and an earlier version of this line
    // compared visitRows.length, which let a single person take the board out of
    // its honest empty state and leave a page headed "what India is asking for"
    // showing one column.
    thin:
      categories.length === 0 &&
      brands.length === 0 &&
      needs.length === 0 &&
      audiences.length === 0 &&
      visited.length === 0,
    people,
    searches: logs.length,
    categories,
    brands,
    needs,
    audiences,
    budgets: byPeople(
      logs.filter((l) => !!l.maxPrice)
        .map((l) => ({ key: budgetBand(l.maxPrice!), who: who(l.visitorId) }))
    ),
    queries: byPeople(
      logs.map((l) => ({ key: l.query.toLowerCase().trim(), who: who(l.visitorId) }))
    ).slice(0, 12),
    visited,
    questions: questions
      .filter((q) => q.title)
      .slice(0, 8)
      .map((q) => ({ title: q.title, slug: q.id, answers: q._count.answers })),
    // Shown deliberately, and at a lower floor: a gap two people hit is still a
    // gap, and admitting what we cannot answer is more useful to a shopper than
    // pretending the catalog is complete.
    unserved: byPeople(
      logs.filter((l) => l.resultCount === 0 && l.query)
        .map((l) => ({ key: l.query.toLowerCase().trim(), who: who(l.visitorId) })),
      2
    ).slice(0, 8)
  };
}

/** Brand slug for linking a pulse row back into the directory. */
export function brandSlug(name: string) {
  return slugify(name);
}
