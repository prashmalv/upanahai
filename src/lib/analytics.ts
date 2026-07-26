import { prisma } from "@/lib/db";

/**
 * Read side of the analytics. Every function is scoped by a day window so the
 * dashboard can offer 7/30/90-day views without duplicating query logic.
 *
 * Counts of *people* use distinct visitorId, not row counts — otherwise one
 * enthusiastic user looks like traffic.
 */

export type Window = 7 | 30 | 90 | 365;

const since = (days: Window) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

function tally<T extends string>(rows: { key: T }[]): { key: T; count: number }[] {
  const m = new Map<T, number>();
  for (const r of rows) {
    if (!r.key) continue;
    m.set(r.key, (m.get(r.key) || 0) + 1);
  }
  // Array.from rather than spread: tsconfig targets ES5, where iterating a Map
  // needs downlevelIteration.
  return Array.from(m.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getOverview(days: Window) {
  const from = since(days);

  const [
    totalUsers,
    newUsers,
    totalSearches,
    events,
    questions,
    answers,
    brandReviews,
    productReviews,
    footProfiles
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: from } } }),
    prisma.searchLog.count({ where: { createdAt: { gte: from } } }),
    prisma.event.findMany({
      where: { createdAt: { gte: from } },
      select: { type: true, visitorId: true, userId: true }
    }),
    prisma.question.count({ where: { createdAt: { gte: from } } }),
    prisma.answer.count({ where: { createdAt: { gte: from } } }),
    prisma.brandFeedback.count({ where: { createdAt: { gte: from } } }),
    prisma.feedback.count({ where: { createdAt: { gte: from } } }),
    prisma.footProfile.count()
  ]);

  const visitors = new Set(events.map((e) => e.visitorId).filter(Boolean));
  const signedInUsers = new Set(events.map((e) => e.userId).filter(Boolean));
  const byType = tally(events.map((e) => ({ key: e.type })));
  const countOf = (t: string) => byType.find((b) => b.key === t)?.count ?? 0;

  return {
    totalUsers,
    newUsers,
    uniqueVisitors: visitors.size,
    signedInActive: signedInUsers.size,
    pageViews: countOf("page_view"),
    totalSearches,
    footScans: countOf("foot_scan"),
    photoMatches: countOf("photo_match"),
    tryOns: countOf("try_on"),
    buyClicks: countOf("buy_click"),
    questions,
    answers,
    brandReviews,
    productReviews,
    footProfiles
  };
}

/** Registrations grouped by state and city — "kahan se log register kar rahe hain". */
export async function getGeography(days: Window) {
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since(days) } },
    select: { state: true, city: true }
  });
  const allUsers = await prisma.user.findMany({ select: { state: true, city: true } });

  return {
    byStateWindow: tally(users.map((u) => ({ key: u.state }))),
    byStateAllTime: tally(allUsers.map((u) => ({ key: u.state }))),
    byCityAllTime: tally(allUsers.map((u) => ({ key: u.city }))).slice(0, 15),
    unknownState: allUsers.filter((u) => !u.state).length,
    total: allUsers.length
  };
}

/** What people are actually looking for. */
export async function getDemand(days: Window) {
  const logs = await prisma.searchLog.findMany({
    where: { createdAt: { gte: since(days) } },
    select: {
      query: true,
      gender: true,
      category: true,
      brand: true,
      persona: true,
      needs: true,
      maxPrice: true,
      source: true,
      resultCount: true
    }
  });

  const needs = logs.flatMap((l) =>
    l.needs
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((key) => ({ key }))
  );

  const budgets = logs.map((l) => l.maxPrice).filter((p): p is number => !!p);
  const budgetBands = tally(
    budgets.map((p) => ({
      key:
        p <= 1500 ? "≤ ₹1,500"
        : p <= 3000 ? "₹1,500–3,000"
        : p <= 5000 ? "₹3,000–5,000"
        : p <= 10000 ? "₹5,000–10,000"
        : "> ₹10,000"
    }))
  );

  return {
    totalSearches: logs.length,
    byGender: tally(logs.map((l) => ({ key: l.gender }))),
    byCategory: tally(logs.map((l) => ({ key: l.category }))),
    byBrand: tally(logs.map((l) => ({ key: l.brand }))),
    byPersona: tally(logs.map((l) => ({ key: l.persona }))),
    byNeed: tally(needs),
    bySource: tally(logs.map((l) => ({ key: l.source }))),
    budgetBands,
    // The exact phrasings, most frequent first — useful for spotting demand the
    // catalog can't serve yet.
    topQueries: tally(
      logs.map((l) => ({ key: l.query.toLowerCase().trim() })).filter((r) => r.key)
    ).slice(0, 20),
    // Searches that returned nothing: the clearest gap signal there is.
    zeroResultQueries: tally(
      logs
        .filter((l) => l.resultCount === 0 && l.query)
        .map((l) => ({ key: l.query.toLowerCase().trim() }))
    ).slice(0, 15)
  };
}

/** Daily counts for the trend chart. Returns a dense series (zero-filled). */
export async function getTrend(days: Window) {
  const from = since(days);
  const [events, searches, users] = await Promise.all([
    prisma.event.findMany({
      where: { createdAt: { gte: from }, type: "page_view" },
      select: { createdAt: true }
    }),
    prisma.searchLog.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true }
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true }
    })
  ]);

  const day = (d: Date) => d.toISOString().slice(0, 10);
  const bucket = (rows: { createdAt: Date }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(day(r.createdAt), (m.get(day(r.createdAt)) || 0) + 1);
    return m;
  };
  const views = bucket(events);
  const srch = bucket(searches);
  const regs = bucket(users);

  const out: { date: string; views: number; searches: number; signups: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = day(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    out.push({
      date: d,
      views: views.get(d) || 0,
      searches: srch.get(d) || 0,
      signups: regs.get(d) || 0
    });
  }
  return out;
}

/**
 * Products currently withheld from every listing, and why.
 *
 * Surfaced on the dashboard because a hidden product is lost revenue with a
 * fixable cause — usually "we don't have a picture of this that we're allowed to
 * publish under this brand". Silently hiding them would leave the operator
 * wondering where the catalog went.
 */
export async function getHiddenProducts() {
  const rows = await prisma.product.findMany({
    where: { imageOk: false },
    select: { slug: true, brand: true, name: true, imageNote: true, imageCheckedAt: true },
    orderBy: { brand: "asc" }
  });
  const total = await prisma.product.count();
  return { hidden: rows, total, visible: total - rows.length };
}

/** Brand reputation from the platform's own reviews, not the retailers'. */
export async function getBrandSentiment() {
  const rows = await prisma.brandFeedback.findMany({
    select: {
      brand: true,
      rating: true,
      quality: true,
      comfort: true,
      durability: true,
      valueScore: true,
      sizingAccuracy: true
    }
  });

  type Row = (typeof rows)[number];
  const byBrand = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byBrand.get(r.brand) || [];
    list.push(r);
    byBrand.set(r.brand, list);
  }

  const avg = (ns: number[]) =>
    ns.length ? Number((ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(2)) : 0;

  return Array.from(byBrand.entries())
    .map(([brand, list]: [string, Row[]]) => {
      const rated = (k: "quality" | "comfort" | "durability" | "valueScore") =>
        avg(list.map((l) => l[k]).filter((n) => n > 0));
      const sizing = tally(list.map((l) => ({ key: l.sizingAccuracy })));
      return {
        brand,
        reviews: list.length,
        rating: avg(list.map((l) => l.rating)),
        quality: rated("quality"),
        comfort: rated("comfort"),
        durability: rated("durability"),
        value: rated("valueScore"),
        sizingVerdict: sizing[0]?.key || "true-to-size"
      };
    })
    .sort((a, b) => b.reviews - a.reviews);
}

/** Most-viewed / most-clicked products, from buy_click meta. */
export async function getProductInterest(days: Window) {
  const clicks = await prisma.event.findMany({
    where: { createdAt: { gte: since(days) }, type: "buy_click" },
    select: { meta: true }
  });

  const productIds = clicks
    .map((c) => /product=([^;]*)/.exec(c.meta)?.[1] || "")
    .filter(Boolean);
  const retailers = clicks
    .map((c) => /retailer=([^;]*)/.exec(c.meta)?.[1] || "")
    .filter(Boolean);

  const counted = tally(productIds.map((key) => ({ key }))).slice(0, 10);
  const products = counted.length
    ? await prisma.product.findMany({
        where: { id: { in: counted.map((c) => c.key) } },
        select: { id: true, brand: true, name: true, slug: true }
      })
    : [];

  return {
    topProducts: counted.map((c) => {
      const p = products.find((x) => x.id === c.key);
      return {
        clicks: c.count,
        label: p ? `${p.brand} ${p.name}` : "(deleted product)",
        slug: p?.slug || ""
      };
    }),
    byRetailer: tally(retailers.map((key) => ({ key })))
  };
}
