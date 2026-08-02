import { aiJSON, aiEnabled } from "@/lib/ai";
import { BRAND_DIRECTORY } from "@/lib/brandDirectory";

/**
 * Upanah Mitra — the assistant.
 *
 * TWO THINGS IT MUST NOT DO, AND HOW EACH IS PREVENTED
 *
 * 1. Answer questions that have nothing to do with footwear. A shopping site whose
 *    chatbox will happily do homework, give medical opinions or discuss politics is
 *    a liability with someone else's model behind it. The prompt says so, but a
 *    prompt is a request — so the model must also return `onTopic`, and when that
 *    is false the answer is discarded and replaced with a fixed refusal. The model
 *    classifies; it does not get to decide whether the rule applies to it.
 *
 * 2. Invent links. "Go to /offers/diwali-sale" reads perfectly and 404s. The model
 *    may only choose from ROUTES below, by key, and anything it returns that is
 *    not in that list is dropped before it reaches the page. It cannot type a URL.
 *
 * Everything else it says is ordinary shopping help, and the prompt holds it to
 * the same standards as the rest of the site: no invented prices, no invented
 * stock, and health questions routed to a clinician rather than answered.
 */

export type RouteKey =
  | "search" | "foot-scan" | "size-chart" | "brands" | "trends"
  | "community" | "health" | "foot-health" | "survey" | "match"
  | "try-on" | "wishlist" | "account" | "data-and-privacy";

export const ROUTES: Record<RouteKey, { path: string; label: string; when: string }> = {
  "search":           { path: "/search",            label: "Search footwear",       when: "they want to find or compare shoes" },
  "foot-scan":        { path: "/foot-scan",         label: "Find my size",          when: "they don't know their size, or fit is going wrong" },
  "size-chart":       { path: "/size-chart",        label: "Brand size charts",     when: "they ask how a particular brand's sizing runs" },
  "brands":           { path: "/brands",            label: "Brand directory",       when: "they ask which brands make something, or about a brand" },
  "trends":           { path: "/trends",            label: "What India is searching for", when: "they ask what is popular or in demand" },
  "community":        { path: "/community",         label: "Ask the community",     when: "the question needs a human who has worn the shoe" },
  "health":           { path: "/health",            label: "Foot health log",       when: "they want to track activity or pain over time" },
  "foot-health":      { path: "/foot-health",       label: "Foot health & our limits", when: "they ask what our health features do or don't do" },
  "survey":           { path: "/survey",            label: "How India buys footwear", when: "they want to contribute to or read the buyer survey" },
  "match":            { path: "/match",             label: "Find by photo",         when: "they have a picture of a shoe and want to find it" },
  "try-on":           { path: "/try-on",            label: "Virtual try-on",        when: "they want to see a shoe on themselves" },
  "wishlist":         { path: "/wishlist",          label: "My wishlist",           when: "they ask about shoes they saved" },
  "account":          { path: "/account",           label: "My account",            when: "they ask about their profile, password or saved size" },
  "data-and-privacy": { path: "/data-and-privacy",  label: "Data & privacy",        when: "they ask what is stored about them" }
};

export const MITRA_NAME = "Upanah Mitra";

/** Shown verbatim whenever the question is not about footwear. */
export const OFF_TOPIC =
  "I only know about footwear — sizes, fit, brands, and what to wear for what. " +
  "Ask me something about shoes and I'll do my best.";

export type MitraReply = {
  /** The model's own judgement of whether this is a footwear question. */
  onTopic: boolean;
  answer: string;
  /** Route keys, validated against ROUTES before they leave the server. */
  routes: RouteKey[];
  /** A search this question implies, if any — used to deep-link the results. */
  searchQuery: string;
  /** Dimensions that match the ones the rest of the analytics already uses. */
  signal: {
    category: string;
    brand: string;
    audience: string;
    need: string;
    maxPrice: number | null;
  };
  /** True when the question is really a health question wearing shoes. */
  healthFlag: boolean;
};

const CATEGORIES = ["running", "walking", "sports", "casual", "formal", "orthopedic", "sandals", ""];
const AUDIENCES = ["men", "women", "kids", ""];

function systemPrompt(): string {
  const routeLines = Object.entries(ROUTES)
    .map(([k, r]) => `  "${k}" — ${r.label}: use when ${r.when}`)
    .join("\n");
  const brands = BRAND_DIRECTORY.map((b) => b.name).join(", ");

  return `You are ${MITRA_NAME}, the assistant on Upanah.AI, an Indian footwear
platform. You help people find footwear that fits, and you help them get around
this site.

SCOPE — this is the rule you break least often:
Footwear only. Shoes, sandals, sizing, fit, materials, care, what to wear for a
purpose, and the features of this website. If someone asks about anything else —
recipes, code, politics, other products, general knowledge, medical treatment,
their homework — set onTopic to false and leave answer empty. Do not answer it
partially. Do not answer it "just this once". A polite refusal is handled for you.

HOW TO ANSWER when it is on topic:
- Short. Two or three sentences. This appears in a small box, not a page.
- Plain English, or Hinglish if they wrote in Hinglish. Never more formal than they were.
- Say what you don't know. You cannot see live stock, you cannot see their order
  history, and you do not know today's price at any shop.
- Never invent a price, a discount, a delivery time or a product name. The site
  lists prices read from brands' own stores with the date shown; if they want a
  current price, send them to the brand's store.
- If the honest answer is "measure your feet first", say that. One UK size is
  8.5 mm and most people guess wrong.
- If they describe pain, numbness, a wound that isn't healing, swelling, or
  diabetes, set healthFlag true, keep the answer brief, and say plainly that a
  shoe is not the answer and they should see a doctor. This site is not a medical
  device and you are not a clinician.

NAVIGATION:
Choose up to 2 route keys from this list. Never write a URL yourself.
${routeLines}

Brands this site knows: ${brands}.
If they name a brand not on that list, say we don't cover it yet rather than
guessing about it.

SIGNAL — fill these from what they asked, empty string when not stated:
  category: one of running, walking, sports, casual, formal, orthopedic, sandals
  brand: exactly as spelled in the brand list above, or empty
  audience: men, women, kids, or empty
  need: one short phrase like "arch support", "wide fit", "grip", "cushioning"
  maxPrice: a number in rupees if they gave a budget, else null
  searchQuery: what to type into our search to answer this, or empty

Reply with JSON only:
{"onTopic":true,"answer":"...","routes":["search"],"searchQuery":"...",
 "signal":{"category":"","brand":"","audience":"","need":"","maxPrice":null},
 "healthFlag":false}`;
}

/**
 * Words that make a question plausibly about footwear, including the Hinglish a
 * shopper here would actually type. Used only by the offline fallback.
 */
const FOOTWEAR_WORDS = [
  "shoe", "shoes", "footwear", "sneaker", "sneakers", "sandal", "sandals", "slipper",
  "slippers", "boot", "boots", "loafer", "heel", "heels", "flat", "flats", "clog",
  "chappal", "joota", "jute", "jutti", "mojari", "sole", "insole", "lace", "laces",
  "size", "sizing", "fit", "fitting", "width", "wide", "narrow", "arch", "cushion",
  "grip", "toe", "foot", "feet", "naap", "size chart", "uk", "eu", "brand",
  "running", "walking", "sports", "formal", "casual", "school", "trek", "gym",
  "wear", "pehnn", "pehen", "orthopedic", "orthopaedic", "diabetic", "blister",
  "comfort", "leather", "canvas", "mitra", "upanah", "wishlist", "order"
];

/**
 * Keyword routing, used when the AI is unavailable.
 *
 * It exists so the box still does something useful during an outage rather than
 * apologising. It routes and it declines to answer; it never tries to sound like
 * the model, because a fallback that pretends is worse than one that admits.
 *
 * It also has to hold the topic line on its own. An earlier version returned
 * onTopic: true for everything, so a prompt the model refused outright — one
 * jailbreak attempt did exactly this, coming back as null — fell through to here
 * and was treated as a footwear question. No answer leaked, because this path has
 * no answer to leak, but a refusal that depends on the model being reachable is
 * not a refusal. With no footwear word anywhere in the question, this declines.
 */
export function routeWithoutAI(question: string): MitraReply {
  const q = question.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => q.includes(w));

  const looksLikeFootwear =
    FOOTWEAR_WORDS.some((w) => new RegExp(`(^|[^a-z])${w}`).test(q)) ||
    BRAND_DIRECTORY.some((b) => q.includes(b.name.toLowerCase()));
  if (!looksLikeFootwear) {
    return {
      onTopic: false,
      answer: "",
      routes: [],
      searchQuery: "",
      signal: { category: "", brand: "", audience: "", need: "", maxPrice: null },
      healthFlag: false
    };
  }

  const routes: RouteKey[] = [];
  if (has("size", "fit", "measure", "naap", "size kya")) routes.push("foot-scan");
  if (has("chart", "conversion", "uk", "eu")) routes.push("size-chart");
  if (has("brand", "company")) routes.push("brands");
  if (has("pain", "hurt", "dard", "heel", "arch")) routes.push("health");
  if (routes.length === 0) routes.push("search");

  const brand = BRAND_DIRECTORY.find((b) => q.includes(b.name.toLowerCase()))?.name ?? "";
  const category = CATEGORIES.find((c) => c && q.includes(c)) ?? "";
  const audience = AUDIENCES.find((a) => a && q.includes(a)) ?? "";

  return {
    onTopic: true,
    answer:
      "The assistant is offline at the moment, so I can't answer in words — but " +
      "here's where the answer lives on the site.",
    routes: routes.slice(0, 2),
    searchQuery: question.slice(0, 80),
    signal: { category, brand, audience, need: "", maxPrice: null },
    healthFlag: has("pain", "numb", "wound", "swell", "diabet", "dard")
  };
}

/** Ask Mitra. Returns a reply that is always safe to render. */
export async function askMitra(
  question: string,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<{ reply: MitraReply; usedAI: boolean }> {
  if (!aiEnabled) return { reply: routeWithoutAI(question), usedAI: false };

  // The last few turns only. A long transcript costs tokens and gives the model
  // more room to drift off the one rule that matters.
  const context = history
    .slice(-4)
    .map((h) => `${h.role === "user" ? "Shopper" : "Mitra"}: ${h.content}`)
    .join("\n");

  const raw = await aiJSON<MitraReply>(
    systemPrompt(),
    context ? `${context}\nShopper: ${question}` : question,
    { maxTokens: 900 }
  );
  if (!raw) return { reply: routeWithoutAI(question), usedAI: false };

  // Everything below this line treats the model's output as untrusted input.
  const routes = (Array.isArray(raw.routes) ? raw.routes : [])
    .filter((r): r is RouteKey => typeof r === "string" && r in ROUTES)
    .slice(0, 2);

  const onTopic = raw.onTopic !== false;
  const answer = String(raw.answer ?? "").trim().slice(0, 700);

  const sig = raw.signal ?? ({} as MitraReply["signal"]);
  const price = Number(sig.maxPrice);
  const knownBrand = BRAND_DIRECTORY.find(
    (b) => b.name.toLowerCase() === String(sig.brand ?? "").toLowerCase()
  )?.name ?? "";

  return {
    usedAI: true,
    reply: {
      onTopic,
      // An empty answer on an on-topic question means the model returned nothing
      // usable; route rather than show a blank box.
      answer: onTopic ? answer || routeWithoutAI(question).answer : "",
      routes: onTopic ? routes : [],
      searchQuery: String(raw.searchQuery ?? "").trim().slice(0, 120),
      signal: {
        category: CATEGORIES.includes(String(sig.category ?? "")) ? String(sig.category) : "",
        brand: knownBrand,
        audience: AUDIENCES.includes(String(sig.audience ?? "")) ? String(sig.audience) : "",
        need: String(sig.need ?? "").trim().slice(0, 40),
        maxPrice: Number.isFinite(price) && price > 0 ? Math.round(price) : null
      },
      healthFlag: raw.healthFlag === true
    }
  };
}
