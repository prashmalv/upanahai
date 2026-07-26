/**
 * Foot length (mm) -> UK / EU / US shoe size.
 *
 * WHY THE NUMBERS ARE WHAT THEY ARE
 *
 * Shoe sizes are defined on the *internal length of the shoe* (the "last"), not
 * on the bare foot, so every conversion needs an allowance added first:
 *
 *   adults : +17 mm  — the value that makes the barleycorn formula agree with
 *                      published UK/Brannock charts (267 mm foot -> UK 8.5)
 *   kids   : +14 mm  — smaller last, but deliberate growth room
 *
 * Then two classical systems:
 *   UK adult = 3 x lastInches - 25      (barleycorn, 1 size = 1/3 inch = 8.47 mm)
 *   UK child = 3 x lastInches - 12      (the child scale restarts at 0)
 *   EU       = lastMm / 6.667           (Paris point = 2/3 cm)
 *
 * THE PREVIOUS VERSION WAS WRONG FOR CHILDREN. It applied the adult formula to
 * every foot and then clamped `if (uk < 1) uk = 1`, so every foot shorter than
 * ~203 mm — i.e. every child up to roughly age 12 — came back as "UK 1".
 * Anchors below are asserted in prisma/../lib tests so that can't regress.
 *
 * One size step is only 8.47 mm and a half step 4.23 mm. That tolerance is the
 * reason `sizeRange()` exists: a measurement with ±6 mm of uncertainty simply
 * cannot name a single size honestly.
 */

export type Audience = "men" | "women" | "kids";

export type SizeResult = {
  uk: number;
  eu: number;
  us: number;
  /** Inclusive size band implied by the measurement's uncertainty. */
  ukRange: [number, number];
  widthCategory: "narrow" | "D" | "wide";
  recommendation: string;
  /** True when the child scale was used, so the UI can label it. */
  childScale: boolean;
};

const ADULT_ALLOWANCE_MM = 17;
const KIDS_ALLOWANCE_MM = 14;
const MM_PER_SIZE = 25.4 / 3; // 8.466 mm — one barleycorn

/** Largest child foot before the UK scale restarts at adult 1 (~UK child 13.5). */
const KIDS_MAX_FOOT_MM = 205;

const halfStep = (n: number) => Math.round(n * 2) / 2;

function ukFromFoot(footMm: number, child: boolean): number {
  const lastMm = footMm + (child ? KIDS_ALLOWANCE_MM : ADULT_ALLOWANCE_MM);
  const lastInches = lastMm / 25.4;
  return 3 * lastInches - (child ? 12 : 25);
}

function euFromFoot(footMm: number, child: boolean): number {
  const lastMm = footMm + (child ? KIDS_ALLOWANCE_MM : ADULT_ALLOWANCE_MM);
  return lastMm / 6.667;
}

export function mmToSizes(
  lengthMm: number,
  widthMm: number,
  audience: Audience = "men",
  /** ± mm of measurement uncertainty; drives ukRange. */
  toleranceMm = 0
): SizeResult {
  // Use the child scale when asked for, or whenever the foot is clearly a
  // child's — an adult chart on a 150 mm foot produces nonsense either way.
  const child = audience === "kids" || lengthMm < KIDS_MAX_FOOT_MM;

  const ukRaw = ukFromFoot(lengthMm, child);
  const uk = Math.max(child ? 0.5 : 1, halfStep(ukRaw));
  const eu = halfStep(euFromFoot(lengthMm, child));

  // US offsets. Women's US runs ~2 sizes above UK; men's ~1; children's ~1.
  // Kids' US numbering also splits into toddler/little/big kid ranges that
  // differ per brand, which is why the UI shows UK/EU first for children.
  const usOffset = child ? 1 : audience === "women" ? 2 : 1;
  const us = halfStep(uk + usOffset);

  const ukLow = Math.max(child ? 0.5 : 1, halfStep(ukFromFoot(lengthMm - toleranceMm, child)));
  const ukHigh = Math.max(ukLow, halfStep(ukFromFoot(lengthMm + toleranceMm, child)));

  // Width category from the width/length ratio rather than absolute width, so
  // it works across foot sizes.
  const ratio = widthMm > 0 && lengthMm > 0 ? widthMm / lengthMm : 0.38;
  let widthCategory: SizeResult["widthCategory"] = "D";
  if (ratio > 0 && ratio < 0.36) widthCategory = "narrow";
  else if (ratio > 0.4) widthCategory = "wide";

  const recommendation = child
    ? widthCategory === "wide"
      ? "Wide little foot — pick velcro or adjustable straps over slip-ons, and check the toe box."
      : "Leave about a thumb's width of growing room; re-measure every 3-4 months."
    : widthCategory === "wide"
    ? "Choose wide-fit models; avoid narrow formal lasts."
    : widthCategory === "narrow"
    ? "Narrow foot — lace-ups hold better than slip-ons."
    : "Standard D width — most brands will fit comfortably.";

  return { uk, eu, us, ukRange: [ukLow, ukHigh], widthCategory, recommendation, childScale: child };
}

/**
 * How much to trust a measurement, expressed as ± mm.
 *
 * A single photo has no depth information, so a vision estimate carries real
 * error: camera tilt foreshortens the foot, the reference card sits on the floor
 * while the foot has height, and phone lenses distort at the edges. A tapped,
 * perspective-corrected measurement is far tighter because the geometry is
 * solved rather than guessed.
 */
export function toleranceFor(source: "measured" | "ai" | "manual", confidence = 0): number {
  if (source === "manual") return 2; // the user measured with a ruler
  if (source === "measured") return 3; // homography-corrected tap measurement
  // AI estimate: 0.9 confidence -> ±5 mm, 0.3 -> ±14 mm
  const c = Math.min(1, Math.max(0, confidence));
  return Math.round(5 + (1 - c) * 13);
}

/**
 * Below this confidence we refuse to name a size. Naming one anyway is the
 * failure mode that gets a shopper the wrong shoe and blames the platform.
 */
export const MIN_CONFIDENCE_FOR_SIZE = 0.55;

export type FitQuality = "good" | "rough" | "unusable";

export function fitQuality(source: "measured" | "ai" | "manual", confidence = 0): FitQuality {
  if (source === "manual" || source === "measured") return "good";
  if (confidence >= 0.75) return "good";
  if (confidence >= MIN_CONFIDENCE_FOR_SIZE) return "rough";
  return "unusable";
}

/** Plausibility guard — rejects readings that cannot be a human foot. */
export function isPlausibleFoot(lengthMm: number): boolean {
  return Number.isFinite(lengthMm) && lengthMm >= 90 && lengthMm <= 360;
}

/**
 * Heuristic fallback used when no AI vision is configured.
 *
 * It only returns a number when the caller actually supplies a pixel ratio.
 * The previous version returned a hardcoded 262 mm ("UK 8") for everybody when
 * called with no arguments, which looked like a measurement but was a constant.
 */
export function estimateFallback(input: {
  footPx?: number;
  refPx?: number;
  refRealMm?: number; // A4 long edge 297, card long edge 85.6
}): { lengthMm: number; widthMm: number; archType: "flat" | "normal" | "high"; confidence: number } | null {
  if (input.footPx && input.refPx && input.refRealMm) {
    const mmPerPx = input.refRealMm / input.refPx;
    const lengthMm = Math.round(input.footPx * mmPerPx);
    return { lengthMm, widthMm: Math.round(lengthMm * 0.38), archType: "normal", confidence: 0.6 };
  }
  return null;
}

/** Millimetres between two adjacent half sizes — used by the UI copy. */
export const HALF_SIZE_MM = Math.round((MM_PER_SIZE / 2) * 10) / 10;
