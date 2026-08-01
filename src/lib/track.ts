import { prisma } from "@/lib/db";
import { headers } from "next/headers";

/**
 * Analytics writes. Every function here is fire-and-forget by contract: a
 * failed insert must never break the user-facing request it was attached to,
 * so errors are logged and swallowed.
 */

/**
 * True when the request is our own automated sweep rather than a person.
 *
 * The sanity suite searches, scans and clicks its way through the whole site,
 * and every run used to land in the analytics as a fresh visitor. Enough runs and
 * the public demand board — which exists precisely to avoid passing a handful of
 * visits off as a trend — starts publishing rows made entirely of our test
 * traffic. That happened in production and had to be cleaned out by hand.
 *
 * Excluding it makes the numbers more true, not less. The header is only a
 * request to not be counted: it grants nothing, so a stranger sending it can
 * exclude their own visit and that is all.
 */
export function isOurOwnTraffic(): boolean {
  try {
    return headers().get("x-upanah-sanity") === "1";
  } catch {
    // Called outside a request scope (a script). Not a person either way.
    return true;
  }
}

export type EventType =
  | "page_view"
  | "search"
  | "foot_scan"
  | "photo_match"
  | "try_on"
  | "buy_click"
  /** Sent a shopper to a brand's own store — the lead we deliver to brands. */
  | "brand_visit"
  | "signup"
  | "login"
  | "question"
  | "answer"
  | "brand_review"
  | "product_review";

export async function logEvent(e: {
  type: EventType;
  path?: string;
  userId?: string | null;
  visitorId?: string;
  meta?: string;
  referrer?: string;
}) {
  if (isOurOwnTraffic()) return;
  try {
    await prisma.event.create({
      data: {
        type: e.type,
        path: (e.path || "").slice(0, 300),
        userId: e.userId || null,
        visitorId: e.visitorId || "",
        meta: (e.meta || "").slice(0, 300),
        referrer: (e.referrer || "").slice(0, 300)
      }
    });
  } catch (err) {
    console.error("[track] event failed:", (err as Error).message);
  }
}

export async function logSearch(s: {
  query: string;
  source?: string;
  userId?: string | null;
  visitorId?: string;
  gender?: string;
  category?: string;
  brand?: string;
  persona?: string;
  maxPrice?: number | null;
  needs?: string[];
  aiParsed?: boolean;
  resultCount?: number;
}) {
  if (isOurOwnTraffic()) return;
  try {
    await prisma.searchLog.create({
      data: {
        query: (s.query || "").slice(0, 300),
        source: s.source || "text",
        userId: s.userId || null,
        visitorId: s.visitorId || "",
        gender: s.gender || "",
        category: s.category || "",
        brand: s.brand || "",
        persona: s.persona || "",
        maxPrice: s.maxPrice ?? null,
        needs: (s.needs || []).join(","),
        aiParsed: !!s.aiParsed,
        resultCount: s.resultCount ?? 0
      }
    });
  } catch (err) {
    console.error("[track] search failed:", (err as Error).message);
  }
}
