import { prisma } from "@/lib/db";
import { improved, summarise, MIN_EPISODES_FOR_RATE } from "@/lib/outcomes";

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
    where: { OR: [{ imageOk: false }, { imageBrandSafe: false }] },
    select: {
      slug: true, brand: true, name: true,
      imageOk: true, imageNote: true,
      imageBrandSafe: true, imageBrandNote: true,
      imageCheckedAt: true
    },
    orderBy: { brand: "asc" }
  });
  const total = await prisma.product.count();
  return {
    hidden: rows.map((r) => ({
      ...r,
      // Surface whichever gate actually blocked it.
      reason: !r.imageOk ? r.imageNote : r.imageBrandNote
    })),
    total,
    visible: total - rows.length
  };
}

/**
 * Leads sent to each brand's own store.
 *
 * This is the number a brand cares about, and the reason a neutral directory is
 * worth their attention: qualified traffic from someone who already knows their
 * size and has read other buyers' verdicts. Recorded server-side on the
 * redirect, so it can be accounted for if a brand ever asks.
 */
export async function getBrandLeads(days: Window) {
  const rows = await prisma.event.findMany({
    where: { createdAt: { gte: since(days) }, type: "brand_visit" },
    select: { meta: true, visitorId: true }
  });
  const byBrand = new Map<string, { clicks: number; visitors: Set<string> }>();
  for (const r of rows) {
    const brand = /brand=([^;]*)/.exec(r.meta)?.[1] || "";
    if (!brand) continue;
    const e = byBrand.get(brand) || { clicks: 0, visitors: new Set<string>() };
    e.clicks++;
    if (r.visitorId) e.visitors.add(r.visitorId);
    byBrand.set(brand, e);
  }
  const leads = Array.from(byBrand.entries())
    .map(([brand, v]) => ({ brand, clicks: v.clicks, people: v.visitors.size }))
    .sort((a, b) => b.clicks - a.clicks);
  return { leads, total: rows.length };
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

/**
 * Health outcomes: of the people we gave guidance to, how many felt better.
 *
 * This is the only metric here that measures whether the product did any good,
 * as opposed to how much it was used. It is also the one most easily overstated,
 * so the shape of the return value is deliberately awkward to spin: the response
 * rate sits next to the improvement rate, the "acted on it" and "didn't" groups
 * are reported separately, and `tooEarly` suppresses percentages entirely until
 * there are enough answers for one to mean anything.
 *
 * Also returns the anonymised anthropometry that consented users have agreed to
 * contribute — foot dimensions by state and age band, with no identifiers. India
 * has very little published foot-shape data, and brands size their lasts against
 * Western averages; that gap is the reason a neutral platform is worth building.
 */
export async function getHealthOutcomes() {
  const now = new Date();

  const [episodes, consentCount, researchCount, redFlagUsers] = await Promise.all([
    prisma.careEpisode.findMany({
      select: {
        followUpAt: true,
        dismissedAt: true,
        followUpDueAt: true,
        changedFootwear: true,
        painChange: true,
        comfortRating: true,
        needs: true
      }
    }),
    prisma.user.count({ where: { healthConsentAt: { not: null } } }),
    prisma.user.count({ where: { researchConsent: true } }),
    prisma.healthLog
      .findMany({
        where: { OR: [{ numbness: true }, { woundOrSore: true }, { swelling: true }] },
        select: { userId: true },
        distinct: ["userId"]
      })
      .then((r) => r.length)
  ]);

  const summary = summarise(episodes, now);

  // Which suggested feature shows up most in episodes that improved. Weak
  // evidence on its own — reported as a count, never as "X% effective".
  const needCounts: Record<string, { total: number; improvedCount: number }> = {};
  for (const e of episodes) {
    for (const need of e.needs.split(",").filter(Boolean)) {
      needCounts[need] ||= { total: 0, improvedCount: 0 };
      needCounts[need].total += 1;
      if (e.followUpAt && improved(e.painChange)) needCounts[need].improvedCount += 1;
    }
  }

  // Anonymised anthropometry, and only from people who ticked the research box.
  const contributors = await prisma.user.findMany({
    where: { researchConsent: true, footProfile: { isNot: null } },
    select: {
      state: true,
      persona: true,
      footProfile: {
        select: { lengthMm: true, widthMm: true, archType: true, widthCategory: true }
      }
    }
  });

  const byState: Record<string, { n: number; meanLengthMm: number; wide: number }> = {};
  for (const c of contributors) {
    const f = c.footProfile!;
    const key = c.state || "Not given";
    byState[key] ||= { n: 0, meanLengthMm: 0, wide: 0 };
    const b = byState[key];
    b.meanLengthMm = (b.meanLengthMm * b.n + f.lengthMm) / (b.n + 1);
    b.n += 1;
    if (f.widthCategory === "wide") b.wide += 1;
  }

  return {
    ...summary,
    consentCount,
    researchCount,
    redFlagUsers,
    needCounts: Object.entries(needCounts)
      .map(([need, v]) => ({ need, ...v }))
      .sort((a, b) => b.total - a.total),
    anthropometry: {
      contributors: contributors.length,
      // Suppressed below a floor: a "state average" from two people is not a
      // dataset, and publishing it would make it easy to identify them.
      byState: Object.entries(byState)
        .filter(([, v]) => v.n >= 5)
        .map(([state, v]) => ({
          state,
          n: v.n,
          meanLengthMm: Math.round(v.meanLengthMm),
          widePct: Math.round((v.wide / v.n) * 100)
        }))
        .sort((a, b) => b.n - a.n),
      suppressed: Object.values(byState).filter((v) => v.n < 5).length
    }
  };
}

/**
 * Everyone who has registered, and what they have done.
 *
 * The dashboard could report that there are eleven users; it could not say who
 * they were, so a locked-out person or a prolific reviewer was invisible. This is
 * the operator's own users on their own platform — but it deliberately carries no
 * health data, no measurements and no password material, because running the
 * business does not require any of that and a dashboard that shows it becomes a
 * liability the first time a laptop is left open.
 */
export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      brandName: true,
      city: true,
      state: true,
      persona: true,
      createdAt: true,
      lastLoginAt: true,
      mustChangePassword: true,
      _count: {
        select: {
          brandFeedback: true,
          feedback: true,
          questions: true,
          answers: true
        }
      }
    }
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    brandName: u.brandName,
    where: [u.city, u.state].filter(Boolean).join(", "),
    persona: u.persona,
    joined: u.createdAt,
    lastLogin: u.lastLoginAt,
    mustChangePassword: u.mustChangePassword,
    contributions:
      u._count.brandFeedback + u._count.feedback + u._count.questions + u._count.answers
  }));
}

/** Open "I've forgotten my password" requests, newest first. */
export async function getResetRequests() {
  const rows = await prisma.passwordResetRequest.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      note: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, role: true } }
    }
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    note: r.note,
    at: r.createdAt,
    // False means nobody ever registered with this address. Worth showing rather
    // than hiding: it is usually a typo made at signup, and the person is stuck
    // on an account that does not exist.
    hasAccount: !!r.userId,
    name: r.user?.name || "",
    isAdmin: r.user?.role === "admin"
  }));
}

/**
 * What people ask Upanah Mitra.
 *
 * Recorded on the same dimensions as searches — category, brand, audience, need,
 * budget — so a question typed at the assistant counts as demand rather than
 * sitting in a transcript nobody opens. Two things here are not in the search
 * data and are the reason this section exists separately:
 *
 *   offTopic  — what people expected a footwear assistant to be able to do. Every
 *               one of these is a person who wanted something we don't offer.
 *   health    — how often a shopping box gets used to ask about pain. If that is
 *               a large number, it says more about the market than any survey.
 */
export async function getMitraInsight(days: Window) {
  const turns = await prisma.mitraTurn.findMany({
    where: { createdAt: { gte: since(days) } },
    select: {
      question: true, onTopic: true, healthFlag: true, usedAI: true, routes: true,
      category: true, brand: true, audience: true, need: true, maxPrice: true,
      visitorId: true
    }
  });

  const onTopic = turns.filter((t) => t.onTopic);
  const offTopic = turns.filter((t) => !t.onTopic);

  return {
    total: turns.length,
    people: new Set(turns.map((t) => t.visitorId).filter(Boolean)).size,
    offTopicCount: offTopic.length,
    healthCount: turns.filter((t) => t.healthFlag).length,
    // When this climbs, the model was unreachable and people got the keyword
    // fallback instead of an answer.
    fallbackCount: turns.filter((t) => !t.usedAI).length,
    byCategory: tally(onTopic.map((t) => ({ key: t.category }))),
    byBrand: tally(onTopic.map((t) => ({ key: t.brand }))),
    byAudience: tally(onTopic.map((t) => ({ key: t.audience }))),
    byNeed: tally(onTopic.map((t) => ({ key: t.need.toLowerCase() }))),
    byRoute: tally(
      onTopic.flatMap((t) => t.routes.split(",").filter(Boolean).map((key) => ({ key })))
    ),
    topQuestions: tally(
      onTopic.map((t) => ({ key: t.question.toLowerCase().trim() }))
    ).slice(0, 15),
    // Shown in full rather than counted: the wording is the point.
    offTopicExamples: offTopic.slice(0, 12).map((t) => t.question)
  };
}
