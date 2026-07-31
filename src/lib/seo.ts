/**
 * Single source of truth for SEO + AEO (Answer Engine Optimization).
 *
 * The FAQ list below is rendered as visible page content AND emitted as
 * FAQPage JSON-LD. Keep them driven by the same array — answer engines
 * (and Google) discount schema whose answers don't appear on the page.
 */

export const SITE = {
  name: "Upanah.AI",
  legalName: "Upanah.AI",
  tagline: "Har Kadam Ka Saathi",
  taglineHi: "हर कदम का साथी",
  /** Set NEXT_PUBLIC_APP_URL to the custom domain once upanah.com is pointed here. */
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://upanah-ai.azurewebsites.net").replace(/\/$/, ""),
  locale: "en_IN",
  country: "India",
  /** One-sentence definition — this is what answer engines quote. Keep it factual. */
  definition:
    "Upanah.AI is India's first AI-powered footwear discovery platform: describe your need in plain language or your own voice, and it recommends the right branded shoes, compares prices and ratings across Indian retailers, measures your foot for the correct size, and lets you try shoes on virtually.",
  description:
    "India's first AI footwear platform. Describe your need in plain language, compare branded shoe prices across Amazon, Flipkart and Myntra, scan your foot for the exact size, find shoes from a photo and try them on virtually.",
} as const;

export const BRANDS = [
  "Nike", "Adidas", "Puma", "Skechers", "Asics", "New Balance", "Crocs",
  "Birkenstock", "Clarks", "Woodland", "Bata", "Metro", "Campus", "Dr. Scholl's",
] as const;

export const RETAILERS = [
  "Amazon.in", "Flipkart", "Myntra", "Ajio", "Tata CLiQ", "Decathlon",
] as const;

/** Visible FAQ + FAQPage schema. Answers are short, factual and self-contained. */
export const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Upanah.AI?",
    a: SITE.definition,
  },
  {
    q: "How does Upanah.AI find my correct shoe size?",
    a: "The Foot Fit Scan uses your phone camera. You place a reference object of known size — a bank/ATM card or an A4 sheet — next to your foot and take a photo. Upanah.AI measures your foot length and width in millimetres, detects your arch type, and converts that into a recommended UK, EU and US size plus a width recommendation. The result is saved to your profile so future recommendations use your real measurements.",
  },
  {
    q: "Can I compare shoe prices across Indian retailers on Upanah.AI?",
    a: `Yes. For every shoe, Upanah.AI shows the current price, rating and delivery time from multiple sellers including ${RETAILERS.slice(0, 5).join(", ")} and official brand stores, with the lowest price marked. You buy on the retailer's own site — Upanah.AI links you there rather than selling directly.`,
  },
  {
    q: "Can Upanah.AI identify a shoe from a photo?",
    a: "Yes. With Find by Photo you upload or snap a picture of any shoe and Upanah.AI identifies the style, then shows visually similar branded footwear that is actually available in India, along with prices from different retailers.",
  },
  {
    q: "Does Upanah.AI have a virtual try-on?",
    a: "Yes. Upload your photo, pick a shoe and an outfit context — casual, office, Indian ethnic or sportswear — and Upanah.AI previews how the pair looks on you before you buy.",
  },
  {
    q: "Is Upanah.AI free to use?",
    a: "Yes. Search, price comparison, foot scanning, photo matching, virtual try-on and the health tracker are all free. Upanah.AI does not sell footwear itself; it sends you to the retailer you choose.",
  },
  {
    q: "Which footwear brands does Upanah.AI cover?",
    a: `Upanah.AI covers major footwear brands sold in India, including ${BRANDS.slice(0, 10).join(", ")} and more, across running, walking, sports, casual, formal, sandals and orthopedic/comfort categories for men, women and kids.`,
  },
  {
    q: "Can Upanah.AI recommend footwear for foot pain, seniors or diabetic feet?",
    a: "Yes. Upanah.AI is health-aware. You can log your daily walks, runs and any foot or knee pain, and it will prioritise footwear with the arch support, cushioning and grip that suit your pattern. There are dedicated recommendation modes for seniors, who need stability and comfort, and for sportspersons, who need performance.",
  },
  {
    q: "Does Upanah.AI work for kids' and women's footwear?",
    a: "Yes. Upanah.AI has separate recommendation logic for men, women and kids, including school and play shoes with easy-wear closures for children, and it applies the same price comparison and fit sizing to all of them.",
  },
];

/**
 * How-it-works steps — rendered on the page and emitted as HowTo schema from the
 * same array. Kept to one short sentence each: the visible copy and the schema
 * text must match, and search engines discount schema text that isn't on screen.
 */
export const STEPS = [
  {
    name: "Say what you need",
    text: "Type or speak it in plain language. Upanah.AI turns that into structured intent.",
  },
  {
    name: "Scan your foot",
    text: "One photo beside a bank card gives your length, width and arch — and your real UK, EU and US size.",
  },
  {
    name: "Compare every retailer",
    text: "Price, rating and delivery side by side, lowest highlighted.",
  },
  {
    name: "Try it on, then buy",
    text: "Preview the pair on your own photo, then buy from the retailer you trust.",
  },
];

const abs = (path = "/") => `${SITE.url}${path}`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": abs("/#organization"),
    name: SITE.name,
    legalName: SITE.legalName,
    slogan: SITE.tagline,
    url: abs("/"),
    description: SITE.definition,
    foundingLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressCountry: "IN" },
    },
    areaServed: { "@type": "Country", name: "India" },
    knowsAbout: [
      "footwear fitting",
      "shoe size conversion",
      "footwear price comparison",
      "arch support",
      "orthopedic footwear",
      "virtual try-on",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": abs("/#website"),
    name: SITE.name,
    alternateName: `${SITE.name} — ${SITE.tagline}`,
    url: abs("/"),
    description: SITE.definition,
    inLanguage: ["en-IN", "hi-IN"],
    publisher: { "@id": abs("/#organization") },
    // Lets Google (and answer engines) query the site's own search directly.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: abs("/search?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[] = FAQS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": abs("/#faq"),
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function howToJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": abs("/#howto"),
    name: "How to find your perfect-fit footwear with Upanah.AI",
    description: "Four steps from describing your need to buying the right size shoe in India.",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: abs(t.path),
    })),
  };
}

type ProductLd = {
  slug: string;
  brand: string;
  name: string;
  description: string;
  imageUrl: string;
  colorway?: string | null;
  category: string;
  /**
   * Reviews written by people on this site, and nothing else. Deliberately NOT
   * the product's `rating` / `reviewCount` columns — those came from the demo
   * seed and are invented, and publishing them as an AggregateRating told Google
   * that 1,820 people had rated a shoe two people had actually reviewed.
   */
  feedback: { rating: number; comment: string; authorName: string; createdAt: Date }[];
  /**
   * Real offers only: a price we read off a named store, with the URL of the
   * actual product page it came from and the moment we read it. An offer without
   * a real URL does not belong here — that is what the seeded data was.
   */
  offers: { retailer: string; price: number; url: string; inStock?: boolean; capturedAt: Date }[];
};

/**
 * Product structured data.
 *
 * WHAT IS DELIBERATELY ABSENT, AND WHY
 *
 * Search Console asked for `offers.hasMerchantReturnPolicy`, `offers.shippingDetails`
 * and `offers.validFrom`. We do not publish them, and the reason is not laziness:
 * we are not the merchant. We do not set a return policy, we do not ship anything,
 * and inventing a returns window on a retailer's behalf would be a false statement
 * about someone else's terms, in machine-readable form, to a search engine.
 *
 * Prices were absent for a while for the same reason: the offer rows came from a
 * demo seed — "Amazon.in ₹3,499", with amazon.in's homepage as the link — and
 * emitting those meant asserting prices we had never checked against named
 * retailers. They are back now that they are real, read from each brand's own
 * store, and each one carries `validFrom` — the moment we actually read it, which
 * is the honest answer to Google asking for that field. An offer with no real
 * product URL behind it is still never published.
 *
 * AggregateRating and reviews come only from feedback written here. If nobody has
 * reviewed the product, both are omitted, and Search Console's "missing field
 * 'review'" warning is the correct outcome rather than a problem to make go away.
 */
export function productJsonLd(p: ProductLd) {
  const reviews = p.feedback.filter((f) => f.rating > 0);
  const count = reviews.length;
  const mean =
    count > 0
      ? Math.round((reviews.reduce((a, f) => a + f.rating, 0) / count) * 10) / 10
      : 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": abs(`/product/${p.slug}#product`),
    name: `${p.brand} ${p.name}`,
    brand: { "@type": "Brand", name: p.brand },
    description: p.description,
    image: [p.imageUrl],
    color: p.colorway || undefined,
    category: p.category,
    url: abs(`/product/${p.slug}`),
    aggregateRating:
      count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: mean,
            reviewCount: count,
            bestRating: 5,
            worstRating: 1
          }
        : undefined,
    offers: p.offers.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...p.offers.map((o) => o.price)),
          highPrice: Math.max(...p.offers.map((o) => o.price)),
          offerCount: p.offers.length,
          offers: p.offers.map((o) => ({
            "@type": "Offer",
            priceCurrency: "INR",
            price: o.price,
            url: o.url,
            // When we read this price. Not a promise that it still holds.
            validFrom: o.capturedAt.toISOString().slice(0, 10),
            seller: { "@type": "Organization", name: o.retailer },
            availability:
              o.inStock === false
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock"
          }))
        }
      : undefined,
    review:
      count > 0
        ? reviews.slice(0, 10).map((f) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: f.rating,
              bestRating: 5,
              worstRating: 1
            },
            author: { "@type": "Person", name: f.authorName || "Verified shopper" },
            datePublished: f.createdAt.toISOString().slice(0, 10),
            reviewBody: f.comment || undefined
          }))
        : undefined
  };
}
