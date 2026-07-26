import type { Product } from "@prisma/client";
import type { SearchIntent, ShoeMatch } from "./ai";

/**
 * Heuristic search + ranking engine. Works with or without AI:
 *  - If AI parsed a SearchIntent, we use it.
 *  - Otherwise we derive a lightweight intent from the raw query using keyword rules.
 * This guarantees the platform is useful immediately, and gets smarter with AI on.
 */

const CATEGORY_WORDS: Record<string, string[]> = {
  running: ["run", "running", "jog", "jogging", "marathon", "daudna", "cardio"],
  walking: ["walk", "walking", "stroll", "chalna", "morning walk"],
  casual: ["casual", "sneaker", "sneakers", "everyday", "daily", "college"],
  formal: ["formal", "office", "leather", "derby", "wedding", "ethnic", "mojari", "juti", "suit"],
  sports: ["sport", "sports", "football", "cricket", "gym", "training", "athlete", "turf", "spikes"],
  sandals: ["sandal", "sandals", "slipper", "floater", "chappal", "flip"],
  orthopedic: ["orthopedic", "orthopaedic", "arch", "plantar", "heel pain", "flat feet", "medical"],
  school: ["school", "kids school", "uniform"]
};

const NEED_WORDS: Record<string, string[]> = {
  "arch-support": ["arch", "support", "plantar", "flat feet", "orthopedic"],
  cushioning: ["cushion", "cushioned", "soft", "comfort", "comfortable", "aaram"],
  grip: ["grip", "traction", "non-slip", "anti-skid", "studs"],
  breathability: ["breathable", "mesh", "airy", "summer"],
  "wide-fit": ["wide", "wide fit", "broad"],
  lightweight: ["light", "lightweight", "halka"],
  waterproof: ["waterproof", "rain", "monsoon", "water"],
  "shock-absorption": ["shock", "impact", "knee"]
};

export function deriveIntent(query: string): SearchIntent {
  const q = query.toLowerCase();
  const categories: string[] = [];
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    if (words.some((w) => q.includes(w))) categories.push(cat);
  }
  const needs: string[] = [];
  for (const [need, words] of Object.entries(NEED_WORDS)) {
    if (words.some((w) => q.includes(w))) needs.push(need);
  }
  let gender: SearchIntent["gender"] | undefined;
  if (/\b(women|woman|ladies|female|girl)\b/.test(q)) gender = "women";
  else if (/\b(men|man|male|boy)\b/.test(q)) gender = "men";
  else if (/\b(kid|kids|child|children|baby|toddler)\b/.test(q)) gender = "kids";

  let persona: SearchIntent["persona"] | undefined;
  if (/\b(senior|elderly|old|buzurg|grand)\b/.test(q)) persona = "senior";
  else if (/\b(athlete|sport|marathon|training|player)\b/.test(q)) persona = "sports";
  else if (gender === "kids") persona = "kids";

  const priceMatch = q.match(/(under|below|less than|upto|budget)\s*(?:rs\.?|inr|₹)?\s*(\d{3,6})/);
  const maxPrice = priceMatch ? parseInt(priceMatch[2], 10) : undefined;

  const keywords = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return { gender, categories, keywords, persona, maxPrice, needs };
}

export type Scored = { product: Product & { offers?: any[] }; score: number; lowestPrice: number; reasons: string[] };

const NEED_FIELD: Record<string, keyof Product> = {
  "arch-support": "archSupport",
  cushioning: "cushioning",
  grip: "grip",
  breathability: "breathability"
};

export function scoreProducts(
  products: (Product & { offers?: any[] })[],
  intent: SearchIntent
): Scored[] {
  const results: Scored[] = products.map((p) => {
    let score = 0;
    const reasons: string[] = [];
    const tags = (p.tags || "").toLowerCase();

    // category match (strong signal)
    if (intent.categories?.length) {
      if (intent.categories.includes(p.category)) {
        score += 40;
        reasons.push(`${p.category} type`);
      } else if (intent.categories.some((c) => tags.includes(c))) {
        score += 15;
      }
    }

    // gender
    if (intent.gender) {
      if (p.gender === intent.gender || p.gender === "unisex") score += 18;
      else score -= 12;
    }

    // persona suitability
    if (intent.persona && (p.suitsPersonas || "").includes(intent.persona)) {
      score += 20;
      reasons.push(`good for ${intent.persona}`);
    }

    // needs -> support attributes
    for (const need of intent.needs || []) {
      const field = NEED_FIELD[need];
      if (field) {
        const v = (p as any)[field] as number;
        if (v >= 4) {
          score += 12;
          reasons.push(need.replace("-", " "));
        }
      } else if (tags.includes(need)) {
        score += 8;
        reasons.push(need.replace("-", " "));
      }
    }

    // keyword overlap with tags/name/brand
    const haystack = `${p.brand} ${p.name} ${tags}`.toLowerCase();
    for (const kw of intent.keywords || []) {
      if (haystack.includes(kw)) score += 3;
    }

    // rating & popularity nudge
    score += (p.rating - 4) * 8;
    score += Math.min(p.reviewCount / 500, 6);

    // price constraint
    const lowestPrice = p.offers?.length
      ? Math.min(...p.offers.map((o: any) => o.price))
      : p.basePrice;
    if (intent.maxPrice) {
      if (lowestPrice <= intent.maxPrice) score += 15;
      else score -= 25;
    }

    return { product: p, score, lowestPrice, reasons: reasons.slice(0, 3) };
  });

  return results.sort((a, b) => b.score - a.score);
}

/** Rank catalog against a photo-derived ShoeMatch (visual similarity search). */
export function scoreByImageMatch(
  products: (Product & { offers?: any[] })[],
  match: ShoeMatch
): Scored[] {
  const kw = (match.keywords || []).map((k) => k.toLowerCase());
  const brand = (match.brand || "").toLowerCase();
  const cat = (match.category || "").toLowerCase();
  const color = (match.colorway || "").toLowerCase();

  const scored: Scored[] = products.map((p) => {
    let score = 0;
    const reasons: string[] = [];
    const hay = `${p.brand} ${p.name} ${p.tags} ${p.colorway}`.toLowerCase();

    if (brand && p.brand.toLowerCase() === brand) {
      score += 30;
      reasons.push("same brand");
    }
    if (cat && p.category === cat) {
      score += 25;
      reasons.push("same type");
    }
    if (color && p.colorway.toLowerCase().includes(color.split(" ")[0])) {
      score += 12;
      reasons.push("similar colour");
    }
    for (const k of kw) {
      if (hay.includes(k)) score += 6;
    }
    score += (p.rating - 4) * 5;

    const lowestPrice = p.offers?.length
      ? Math.min(...p.offers.map((o: any) => o.price))
      : p.basePrice;
    return { product: p, score, lowestPrice, reasons: reasons.slice(0, 3) };
  });

  return scored.sort((a, b) => b.score - a.score);
}
