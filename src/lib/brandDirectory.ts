/**
 * Directory of footwear brands sold in India.
 *
 * WHY A DIRECTORY AND NOT A CATALOG
 *
 * A directory sends a shopper to the brand's own store for the actual purchase.
 * That is honest about what this platform is — a neutral guide, not a seller —
 * and it gives brands something they can measure: qualified leads from someone
 * who has already been told their size and read other buyers' verdicts.
 *
 * It also avoids a real problem the product catalog has. Listing an individual
 * shoe needs a photograph of that shoe, and stock photos of *other* brands'
 * footwear cannot be published under a brand's name. A directory needs only the
 * brand's name and its own URL, which is nominative use — the ordinary, lawful
 * way to refer to a brand you are directing customers to.
 *
 * ACCURACY RULES FOR THIS FILE
 *
 * - Every `url` was checked to resolve to a page the brand controls. Several
 *   large brands answer bots with HTTP 403 (Cloudflare/Akamai); those are real
 *   and are kept. Two candidates were dropped after they turned out to resolve
 *   to domain-parking pages rather than the brand.
 * - `priceBand` is a deliberately broad indication, not a price claim.
 * - `knownFor` describes what the brand is generally recognised for. It is not a
 *   ranking and not an endorsement — the neutral judgement on this platform
 *   comes from shopper reviews (lib/brandFit.ts), never from this file.
 * - `indiaStore: false` means the brand has no India-specific storefront we
 *   could verify, so the link goes to their global site. The UI says so.
 */

export type BrandCategory =
  | "sneakers"
  | "running"
  | "sports"
  | "formal"
  | "leather"
  | "casual"
  | "sandals"
  | "boots"
  | "comfort"
  | "ethnic"
  | "school";

export type PriceBand = "value" | "mid" | "premium";

export type DirectoryBrand = {
  name: string;
  url: string;
  /** false when only a global storefront could be verified. */
  indiaStore: boolean;
  origin: "Indian" | "Global";
  priceBand: PriceBand;
  /** Indicative starting price in INR — a rough band, not a quote. */
  fromPrice: number;
  categories: BrandCategory[];
  audiences: ("men" | "women" | "kids")[];
  knownFor: string;
  /** Anything a shopper genuinely benefits from knowing before they click. */
  note?: string;
};

export const PRICE_BANDS: Record<PriceBand, string> = {
  value: "Under ₹2,000",
  mid: "₹2,000 – ₹6,000",
  premium: "₹6,000+"
};

export const CATEGORY_LABEL: Record<BrandCategory, string> = {
  sneakers: "Sneakers",
  running: "Running",
  sports: "Sports",
  formal: "Formal",
  leather: "Leather",
  casual: "Casual",
  sandals: "Sandals & slippers",
  boots: "Boots",
  comfort: "Comfort / orthopedic",
  ethnic: "Ethnic",
  school: "School"
};

export const BRAND_DIRECTORY: DirectoryBrand[] = [
  // ---- global sport & sneaker -------------------------------------------
  {
    name: "Nike", url: "https://www.nike.com/in/", indiaStore: true, origin: "Global",
    priceBand: "premium", fromPrice: 2795,
    categories: ["running", "sneakers", "sports", "casual"],
    audiences: ["men", "women", "kids"],
    knownFor: "Running and basketball performance, plus the sneaker culture end of casual.",
    note: "Running lasts tend to be on the narrow side — worth checking width if you have wide feet."
  },
  {
    name: "Adidas", url: "https://www.adidas.co.in/", indiaStore: true, origin: "Global",
    priceBand: "premium", fromPrice: 2499,
    categories: ["running", "sneakers", "sports", "casual"],
    audiences: ["men", "women", "kids"],
    knownFor: "Running, football and the Originals casual range."
  },
  {
    name: "Puma", url: "https://in.puma.com/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 1799,
    categories: ["sneakers", "running", "sports", "casual"],
    audiences: ["men", "women", "kids"],
    knownFor: "Sporty casual sneakers at a lower entry price than Nike or Adidas."
  },
  {
    name: "Reebok", url: "https://reebok.abfrl.in/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 1799,
    categories: ["running", "sports", "sneakers"],
    audiences: ["men", "women", "kids"],
    knownFor: "Training and gym footwear; classic leather sneakers."
  },
  {
    name: "Asics", url: "https://www.asics.com/in/en-in/", indiaStore: true, origin: "Global",
    priceBand: "premium", fromPrice: 4499,
    categories: ["running", "sports", "comfort"],
    audiences: ["men", "women"],
    knownFor: "Stability and cushioning for distance running; strong on arch support.",
    note: "Prints Japanese cm on the box, which is the foot length itself — the most useful number there."
  },
  {
    name: "New Balance", url: "https://www.newbalance.com/", indiaStore: false, origin: "Global",
    priceBand: "premium", fromPrice: 5999,
    categories: ["running", "sneakers", "comfort"],
    audiences: ["men", "women"],
    knownFor: "Width variants (2E/4E) — among the few brands that genuinely cater to wide feet."
  },
  {
    name: "Skechers", url: "https://www.skechers.in/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 2999,
    categories: ["comfort", "casual", "sneakers"],
    audiences: ["men", "women", "kids"],
    knownFor: "Cushioned slip-ons and walking shoes; a common pick for seniors and long days on foot."
  },
  {
    name: "Converse", url: "https://www.converse.in/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 2499,
    categories: ["sneakers", "casual"],
    audiences: ["men", "women", "kids"],
    knownFor: "Canvas high-tops and low-tops; a flat sole with little arch support."
  },
  {
    // /en-in redirects to the US store, so there is no India storefront.
    // Caught by scripts/check-brand-links.ts — worth re-checking periodically.
    name: "Vans", url: "https://www.vans.com/", indiaStore: false, origin: "Global",
    priceBand: "mid", fromPrice: 2999,
    categories: ["sneakers", "casual"],
    audiences: ["men", "women", "kids"],
    knownFor: "Skate-rooted casual sneakers; flat vulcanised soles."
  },
  {
    name: "Fila", url: "https://fila.co.in/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 1999,
    categories: ["sneakers", "sports", "casual"],
    audiences: ["men", "women"],
    knownFor: "Retro-styled sneakers and everyday sports casuals."
  },
  {
    name: "Crocs", url: "https://www.crocs.in/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 1795,
    categories: ["sandals", "casual", "comfort"],
    audiences: ["men", "women", "kids"],
    knownFor: "Lightweight clogs and sandals; easy-wear for kids and for swollen or sensitive feet.",
    note: "Uses paired sizing (M8/W10) and fits roomy by design."
  },
  {
    name: "Birkenstock", url: "https://www.birkenstock.in/", indiaStore: true, origin: "Global",
    priceBand: "premium", fromPrice: 4990,
    categories: ["sandals", "comfort"],
    audiences: ["men", "women"],
    knownFor: "Contoured cork footbeds — strong arch support in a sandal.",
    note: "EU sizing in whole sizes only, with regular and narrow widths. Round to the nearest."
  },
  {
    name: "Dr. Martens", url: "https://www.drmartens.com/", indiaStore: false, origin: "Global",
    priceBand: "premium", fromPrice: 12995,
    categories: ["boots", "leather", "casual"],
    audiences: ["men", "women"],
    knownFor: "Air-cushioned leather boots built to last; a long break-in period."
  },
  {
    name: "Steve Madden", url: "https://www.stevemadden.in/", indiaStore: true, origin: "Global",
    priceBand: "premium", fromPrice: 4999,
    categories: ["casual", "formal", "sneakers"],
    audiences: ["men", "women"],
    knownFor: "Fashion-forward dress and casual footwear."
  },
  {
    name: "Clarks", url: "https://clarks.in/", indiaStore: true, origin: "Global",
    priceBand: "premium", fromPrice: 4999,
    categories: ["formal", "leather", "casual", "comfort"],
    audiences: ["men", "women"],
    knownFor: "Leather formals and desert boots; publishes width fittings (G/H)."
  },
  {
    name: "Hush Puppies", url: "https://www.hushpuppies.com/", indiaStore: false, origin: "Global",
    priceBand: "premium", fromPrice: 3999,
    categories: ["formal", "leather", "comfort", "casual"],
    audiences: ["men", "women"],
    knownFor: "Soft leather comfort formals; distributed in India through Bata stores."
  },
  {
    name: "Decathlon", url: "https://www.decathlon.in/", indiaStore: true, origin: "Global",
    priceBand: "value", fromPrice: 499,
    categories: ["sports", "running", "boots", "school"],
    audiences: ["men", "women", "kids"],
    knownFor: "Own-label sports footwear at low prices, including trekking and studded boots."
  },

  // ---- Indian heritage, leather & formal --------------------------------
  {
    name: "Bata", url: "https://www.bata.com/in/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 799,
    categories: ["formal", "school", "casual", "comfort", "sandals"],
    audiences: ["men", "women", "kids"],
    knownFor: "The default school shoe and affordable formals; the widest physical store network in India."
  },
  {
    name: "Metro Shoes", url: "https://www.metroshoes.com/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 1990,
    categories: ["formal", "leather", "ethnic", "casual"],
    audiences: ["men", "women"],
    knownFor: "Occasion and formal footwear, including ethnic mojaris and juttis."
  },
  {
    name: "Mochi", url: "https://www.mochishoes.com/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 1990,
    categories: ["formal", "leather", "casual", "ethnic"],
    audiences: ["men", "women"],
    knownFor: "Fashion formals and party footwear; sister brand of Metro."
  },
  {
    name: "Woodland", url: "https://www.woodlandworldwide.com/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 2495,
    categories: ["boots", "leather", "casual", "sandals"],
    audiences: ["men", "women"],
    knownFor: "Rugged nubuck outdoor boots for trekking and travel.",
    note: "Boots run roomy to allow for thick socks — many buyers take their measured size, not a size up."
  },
  {
    name: "Red Chief", url: "https://redchief.in/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 1999,
    categories: ["leather", "boots", "casual", "formal"],
    audiences: ["men"],
    knownFor: "Full-grain leather casuals and boots at mid-market prices."
  },
  {
    name: "Ruosh", url: "https://www.ruosh.com/", indiaStore: true, origin: "Indian",
    priceBand: "premium", fromPrice: 3990,
    categories: ["formal", "leather", "casual"],
    audiences: ["men", "women"],
    knownFor: "Contemporary leather formals and Goodyear-welted dress shoes."
  },
  {
    name: "Tresmode", url: "https://www.tresmode.com/", indiaStore: true, origin: "Indian",
    priceBand: "premium", fromPrice: 3990,
    categories: ["formal", "leather", "casual"],
    audiences: ["men", "women"],
    knownFor: "European-styled leather footwear designed in India."
  },
  {
    name: "Alberto Torresi", url: "https://www.albertotorresi.com/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 1999,
    categories: ["formal", "leather", "comfort"],
    audiences: ["men", "women"],
    knownFor: "Leather formals with a comfort-oriented footbed."
  },
  {
    name: "Lee Cooper", url: "https://leecooper.co.in/", indiaStore: true, origin: "Global",
    priceBand: "mid", fromPrice: 1499,
    categories: ["casual", "leather", "sneakers", "boots"],
    audiences: ["men", "women"],
    knownFor: "Denim-brand casuals and leather shoes; widely stocked in Indian marketplaces."
  },
  {
    name: "Khadim's", url: "https://www.khadims.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 599,
    categories: ["school", "formal", "casual", "sandals"],
    audiences: ["men", "women", "kids"],
    knownFor: "Affordable family footwear with strong school-shoe range in eastern India."
  },
  {
    name: "Liberty", url: "https://www.libertyshoesonline.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 699,
    categories: ["formal", "school", "casual", "sandals", "comfort"],
    audiences: ["men", "women", "kids"],
    knownFor: "Long-standing Indian maker spanning school shoes to formals and orthopedic ranges."
  },
  {
    name: "Action", url: "https://www.actionshoes.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 499,
    categories: ["casual", "school", "sandals", "comfort"],
    audiences: ["men", "women", "kids"],
    knownFor: "Value everyday footwear; long-running comfort and school lines."
  },

  // ---- Indian mass-market & everyday ------------------------------------
  {
    name: "Campus", url: "https://www.campusshoes.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 999,
    categories: ["sneakers", "running", "sports", "school"],
    audiences: ["men", "women", "kids"],
    knownFor: "India's highest-volume sports-styled sneaker brand; strong kids and school range."
  },
  {
    name: "Sparx", url: "https://www.sparxfootwear.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 699,
    categories: ["sneakers", "sandals", "casual", "sports"],
    audiences: ["men", "women", "kids"],
    knownFor: "Everyday sports shoes and floaters at entry prices; part of Relaxo."
  },
  {
    name: "Relaxo", url: "https://relaxofootwear.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 199,
    categories: ["sandals", "casual", "school"],
    audiences: ["men", "women", "kids"],
    knownFor: "India's largest footwear maker by volume — slippers, sandals and everyday wear."
  },
  {
    name: "Paragon", url: "https://paragonfootwear.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 199,
    categories: ["sandals", "casual", "school"],
    audiences: ["men", "women", "kids"],
    knownFor: "Durable everyday slippers and sandals; a household name across small-town India."
  },
  {
    name: "Walkaroo", url: "https://www.walkaroo.in/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 299,
    categories: ["sandals", "casual", "school", "sneakers"],
    audiences: ["men", "women", "kids"],
    knownFor: "Value sandals, slippers and school shoes."
  },
  {
    name: "Aqualite", url: "https://www.aqualiteindia.com/", indiaStore: true, origin: "Indian",
    priceBand: "value", fromPrice: 249,
    categories: ["sandals", "casual", "school"],
    audiences: ["men", "women", "kids"],
    knownFor: "Lightweight EVA sandals and slippers; very light on the foot."
  },

  // ---- comfort / orthopedic / sustainable D2C ---------------------------
  {
    name: "Von Wellx", url: "https://www.vonwellx.com/", indiaStore: true, origin: "Indian",
    priceBand: "premium", fromPrice: 3499,
    categories: ["comfort", "formal", "casual", "leather"],
    audiences: ["men", "women"],
    knownFor: "German-engineered comfort footwear positioned for foot pain and long standing hours."
  },
  {
    name: "Neeman's", url: "https://neemans.com/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 1799,
    categories: ["casual", "sneakers", "comfort"],
    audiences: ["men", "women"],
    knownFor: "Merino wool and recycled-material everyday shoes; breathable and machine-washable."
  },
  {
    name: "Bacca Bucci", url: "https://baccabucci.com/", indiaStore: true, origin: "Indian",
    priceBand: "mid", fromPrice: 1499,
    categories: ["sneakers", "boots", "casual"],
    audiences: ["men", "women"],
    knownFor: "Streetwear-styled chunky sneakers and boots at mid prices."
  }
];

/** Every category that at least one brand covers, in display order. */
export const ALL_CATEGORIES: BrandCategory[] = [
  "sneakers", "running", "sports", "casual", "formal", "leather",
  "boots", "sandals", "comfort", "ethnic", "school"
];

export function brandBySlug(slug: string): DirectoryBrand | undefined {
  const s = slug.trim().toLowerCase();
  return BRAND_DIRECTORY.find(
    (b) => b.name.toLowerCase() === s || slugify(b.name) === s
  );
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export type BrandFilter = {
  category?: BrandCategory;
  audience?: "men" | "women" | "kids";
  priceBand?: PriceBand;
  origin?: "Indian" | "Global";
  q?: string;
};

export function filterBrands(f: BrandFilter): DirectoryBrand[] {
  const q = f.q?.trim().toLowerCase();
  return BRAND_DIRECTORY.filter((b) => {
    if (f.category && !b.categories.includes(f.category)) return false;
    if (f.audience && !b.audiences.includes(f.audience)) return false;
    if (f.priceBand && b.priceBand !== f.priceBand) return false;
    if (f.origin && b.origin !== f.origin) return false;
    if (q && !(`${b.name} ${b.knownFor} ${b.categories.join(" ")}`.toLowerCase().includes(q)))
      return false;
    return true;
  });
}
