import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Read SITE.url per request so pointing NEXT_PUBLIC_APP_URL at the custom domain
// takes effect without a rebuild (otherwise the old host stays baked in).
export const dynamic = "force-dynamic";

/**
 * Answer engines only cite what they are allowed to fetch. These crawlers are
 * named explicitly so a future blanket policy change can't quietly de-index us
 * from ChatGPT / Claude / Perplexity / Gemini answers.
 */
const AI_CRAWLERS = [
  "GPTBot",            // OpenAI — training + ChatGPT browsing index
  "OAI-SearchBot",     // OpenAI — ChatGPT search results
  "ChatGPT-User",      // OpenAI — live fetch when a user asks
  "ClaudeBot",         // Anthropic — Claude
  "Claude-User",       // Anthropic — live fetch on user request
  "Claude-SearchBot",  // Anthropic — Claude search
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",   // Gemini / AI Overviews grounding
  "Applebot-Extended",
  "meta-externalagent",
  "Bingbot",
  "DuckDuckBot",
  "YandexBot"
];

const DISALLOW = ["/api/", "/account", "/wishlist", "/login", "/admin"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((ua) => ({
        userAgent: ua,
        allow: "/",
        disallow: DISALLOW
      }))
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url
  };
}
