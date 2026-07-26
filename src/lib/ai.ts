import OpenAI from "openai";

/**
 * Unified AI client for Upanah.AI.
 *
 * Priority:
 *   1. Azure OpenAI   (if AZURE_OPENAI_* set)  — recommended for Azure hosting
 *   2. OpenAI         (if OPENAI_API_KEY set)
 *   3. null           — callers fall back to the heuristic engine
 *
 * All higher-level features degrade gracefully when no provider is configured,
 * so the app is fully usable out-of-the-box and turns "real" the moment you add
 * credentials in .env.
 */

type Provider = "azure" | "openai" | null;

function detectProvider(): Provider {
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) return "azure";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export const aiProvider = detectProvider();
export const aiEnabled = aiProvider !== null;

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (client) return client;
  if (aiProvider === "azure") {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";
    const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o";
    client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { "api-version": apiVersion },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY! }
    });
  } else if (aiProvider === "openai") {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return client;
}

function chatModel() {
  return aiProvider === "azure"
    ? process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o"
    : process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
}

function visionModel() {
  return aiProvider === "azure"
    ? process.env.AZURE_OPENAI_VISION_DEPLOYMENT ||
        process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ||
        "gpt-4o"
    : process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
}

/**
 * Ask the model for strict JSON. Returns null if AI unavailable or on error.
 *
 * Parameter shape notes (verified against the deployed models):
 *  - GPT-5 class models reject `max_tokens` and require `max_completion_tokens`.
 *    We send the modern field and retry with the legacy one if a deployment is
 *    still on a GPT-4 class model.
 *  - GPT-5 class models also reject any `temperature` other than the default,
 *    so we don't send one at all. Determinism comes from the JSON schema in the
 *    system prompt plus `response_format`.
 *  - Reasoning tokens are billed against the completion budget, so the budget
 *    has to be generous: too small and the JSON is truncated, JSON.parse throws,
 *    and the whole feature silently degrades to the heuristic engine.
 */
export async function aiJSON<T = any>(
  system: string,
  user: string,
  opts: { imageDataUrl?: string; maxTokens?: number } = {}
): Promise<T | null> {
  const c = getClient();
  if (!c) return null;

  const userContent: any = opts.imageDataUrl
    ? [
        { type: "text", text: user },
        { type: "image_url", image_url: { url: opts.imageDataUrl } }
      ]
    : user;

  const base = {
    model: opts.imageDataUrl ? visionModel() : chatModel(),
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: userContent }
    ]
  };
  const budget = opts.maxTokens ?? 1500;

  const call = async (legacyTokenField: boolean) => {
    const params: any = legacyTokenField
      ? { ...base, max_tokens: budget }
      : { ...base, max_completion_tokens: budget };
    return c.chat.completions.create(params);
  };

  try {
    let res;
    try {
      res = await call(false);
    } catch (err) {
      const msg = (err as Error).message || "";
      if (!/max_completion_tokens/i.test(msg)) throw err;
      // Older GPT-4 class deployment — fall back to the legacy field.
      res = await call(true);
    }

    const choice = res.choices[0];
    const text = choice?.message?.content?.trim();
    if (!text) {
      console.error(
        `[ai] empty completion (finish_reason=${choice?.finish_reason}) — ` +
          "raise maxTokens if this is 'length'"
      );
      return null;
    }
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("[ai] request failed, falling back:", (err as Error).message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Feature helpers                                                     */
/* ------------------------------------------------------------------ */

export type SearchIntent = {
  gender?: "men" | "women" | "kids" | "unisex";
  categories: string[]; // running, walking, casual, formal, sports, sandals, orthopedic
  keywords: string[];
  persona?: "general" | "senior" | "sports" | "kids";
  maxPrice?: number;
  needs: string[]; // arch-support, cushioning, grip, breathability, wide-fit ...
  occasion?: string; // office, wedding, gym, daily, trekking ...
};

const INTENT_SYSTEM = `You are Upanah.AI's footwear search understanding engine for the Indian market.
Extract structured shopping intent from a natural-language (English or Hindi/Hinglish) query.
Return ONLY JSON with this shape:
{"gender":"men|women|kids|unisex|null","categories":[],"keywords":[],"persona":"general|senior|sports|kids|null","maxPrice":number|null,"needs":[],"occasion":"string|null"}
categories must be from: running, walking, casual, formal, sports, sandals, orthopedic, school.
needs may include: arch-support, cushioning, grip, breathability, wide-fit, lightweight, waterproof, shock-absorption.`;

export async function parseSearchIntent(query: string): Promise<SearchIntent | null> {
  return aiJSON<SearchIntent>(INTENT_SYSTEM, `Query: """${query}"""`);
}

export type ShoeMatch = {
  brand?: string;
  model?: string;
  category?: string;
  colorway?: string;
  keywords: string[];
  description: string;
};

const SHOE_VISION_SYSTEM = `You are Upanah.AI's shoe recognition engine. Given a photo of a shoe/footwear,
identify it as best you can. Return ONLY JSON:
{"brand":"string|null","model":"string|null","category":"running|walking|casual|formal|sports|sandals|orthopedic|null","colorway":"string","keywords":["visual attributes useful to find visually-similar shoes"],"description":"one line"}.
If unsure of the exact model, still infer type, colour and style keywords.`;

export async function analyzeShoeImage(imageDataUrl: string): Promise<ShoeMatch | null> {
  return aiJSON<ShoeMatch>(
    SHOE_VISION_SYSTEM,
    "Identify this footwear and give search keywords to find visually similar shoes available in India.",
    { imageDataUrl }
  );
}

export type FootMeasurement = {
  lengthMm: number;
  widthMm: number;
  archType: "flat" | "normal" | "high";
  confidence: number; // 0..1
  note?: string;
};

const FOOT_VISION_SYSTEM = `You are Upanah.AI's foot-measurement assistant. The user photographs their foot
placed on an A4 sheet (297x210 mm) OR next to a standard credit/debit card (85.6x53.98 mm) used as a size reference.
Estimate foot length and width in millimetres using the reference object for scale, and classify the arch.
Return ONLY JSON: {"lengthMm":number,"widthMm":number,"archType":"flat|normal|high","confidence":0..1,"note":"string"}.`;

export async function estimateFootFromImage(imageDataUrl: string): Promise<FootMeasurement | null> {
  return aiJSON<FootMeasurement>(
    FOOT_VISION_SYSTEM,
    "Estimate this foot's length/width in mm and arch type using the reference object in the photo.",
    { imageDataUrl }
  );
}

/** Natural-language explanation of why a set of products fits the user's need. */
export async function explainRecommendation(
  query: string,
  productSummaries: string[]
): Promise<string | null> {
  const res = await aiJSON<{ summary: string }>(
    `You are Upanah.AI's shopping advisor. In 1-2 friendly sentences (may use Hinglish), explain why these shoes suit the user's need. Return JSON {"summary":"..."}.`,
    `Need: "${query}"\nTop picks:\n${productSummaries.join("\n")}`
  );
  return res?.summary ?? null;
}
