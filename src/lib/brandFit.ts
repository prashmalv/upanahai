import { prisma } from "@/lib/db";

/**
 * Brand-specific size correction from real buyers.
 *
 * A correct millimetre measurement still doesn't guarantee fit: the same "UK 9"
 * differs between brands because each builds on its own last. No size chart can
 * fix that — but the sizing verdicts collected on every brand review can.
 *
 * If most reviewers say a brand runs small, a shopper measured at UK 8.5 should
 * be told to take UK 9 *for that brand*. That correction is the piece a generic
 * chart cannot offer, and it comes straight from the platform's own data.
 */

export type BrandSizeAdvice = {
  brand: string;
  /** small | true-to-size | large — the majority verdict. */
  verdict: "small" | "true-to-size" | "large";
  /** How many reviews the verdict rests on. */
  reviews: number;
  /** Share of reviewers agreeing with the majority, 0-1. */
  agreement: number;
  /** Size to actually buy in this brand, given the measured size. */
  suggestedUk: number | null;
  /** Half-size step applied: -0.5, 0 or +0.5. */
  adjustment: number;
  message: string;
};

/** Minimum reviews before we act on a verdict rather than just report it. */
const MIN_REVIEWS_TO_ADJUST = 3;
/** Minimum share agreeing before we act on it. */
const MIN_AGREEMENT = 0.6;

export async function getBrandSizeAdvice(
  brand: string,
  measuredUk: number | null
): Promise<BrandSizeAdvice | null> {
  const rows = await prisma.brandFeedback.findMany({
    where: { brand },
    select: { sizingAccuracy: true }
  });
  if (rows.length === 0) return null;

  const counts = rows.reduce<Record<string, number>>((a, r) => {
    a[r.sizingAccuracy] = (a[r.sizingAccuracy] || 0) + 1;
    return a;
  }, {});
  const [topVerdict, topCount] =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["true-to-size", 0];

  const verdict = (["small", "true-to-size", "large"].includes(topVerdict)
    ? topVerdict
    : "true-to-size") as BrandSizeAdvice["verdict"];
  const agreement = topCount / rows.length;

  // Only shift a shopper's size when the signal is strong enough to be worth
  // acting on. Otherwise report the verdict and leave the size alone.
  const strong = rows.length >= MIN_REVIEWS_TO_ADJUST && agreement >= MIN_AGREEMENT;
  const adjustment = !strong || verdict === "true-to-size" ? 0 : verdict === "small" ? 0.5 : -0.5;

  const suggestedUk =
    measuredUk === null ? null : Math.max(0.5, Math.round((measuredUk + adjustment) * 2) / 2);

  let message: string;
  if (!strong) {
    message =
      `Only ${rows.length} ${rows.length === 1 ? "person has" : "people have"} rated ` +
      `${brand}'s sizing so far — not enough to adjust your size yet.`;
  } else if (verdict === "true-to-size") {
    message = `${rows.length} reviewers say ${brand} runs true to size — buy your measured size.`;
  } else if (verdict === "small") {
    message =
      `${Math.round(agreement * 100)}% of ${rows.length} reviewers say ${brand} runs small` +
      (suggestedUk !== null ? ` — consider UK ${suggestedUk} instead of your measured size.` : ".");
  } else {
    message =
      `${Math.round(agreement * 100)}% of ${rows.length} reviewers say ${brand} runs large` +
      (suggestedUk !== null ? ` — consider UK ${suggestedUk} instead of your measured size.` : ".");
  }

  return { brand, verdict, reviews: rows.length, agreement, suggestedUk, adjustment, message };
}
