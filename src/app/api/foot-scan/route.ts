import { NextRequest, NextResponse } from "next/server";
import { estimateFootFromImage, aiEnabled } from "@/lib/ai";
import {
  mmToSizes,
  toleranceFor,
  fitQuality,
  isPlausibleFoot,
  MIN_CONFIDENCE_FOR_SIZE,
  type Audience
} from "@/lib/fit";
import { getSession, readVisitorId } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Source = "measured" | "ai" | "manual";

/**
 * Three ways in, in descending order of trustworthiness:
 *
 *   measured — the user tapped the reference corners and heel/toe, so the length
 *              comes out of solved plane geometry (lib/homography.ts)
 *   manual   — the user measured with a ruler and typed the millimetres
 *   ai       — a vision model estimated it from one photo; useful, but it is an
 *              estimate and is labelled as one all the way to the UI
 *
 * The response always carries `source`, `confidence`, `toleranceMm` and
 * `sizeIsReliable` so the page can never present a guess as a fact.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const audience: Audience =
    body.audience === "women" || body.audience === "kids" || body.audience === "men"
      ? body.audience
      : body.gender === "women"
      ? "women"
      : "men";

  let lengthMm: number | null = null;
  let widthMm: number | null = null;
  let archType = "normal";
  let confidence = 0;
  let source: Source;
  let note: string | undefined;

  if (Number.isFinite(Number(body.measuredLengthMm))) {
    source = body.source === "manual" ? "manual" : "measured";
    lengthMm = Math.round(Number(body.measuredLengthMm));
    widthMm = Number.isFinite(Number(body.measuredWidthMm))
      ? Math.round(Number(body.measuredWidthMm))
      : null;
    confidence = source === "manual" ? 0.95 : 0.9;
  } else if (body.imageDataUrl) {
    source = "ai";
    if (!aiEnabled) {
      return NextResponse.json(
        {
          error:
            "Photo estimation isn't available right now. Use the precise mode " +
            "(tap the sheet corners) or enter your foot length in mm."
        },
        { status: 503 }
      );
    }
    const m = await estimateFootFromImage(body.imageDataUrl);
    if (!m) {
      return NextResponse.json(
        {
          error:
            "Couldn't read that photo. Retake it with the whole sheet and foot in " +
            "frame, or use the precise mode instead."
        },
        { status: 422 }
      );
    }
    lengthMm = Math.round(m.lengthMm);
    widthMm = Math.round(m.widthMm);
    archType = m.archType || "normal";
    confidence = Math.min(1, Math.max(0, m.confidence ?? 0));
    note = m.note;
  } else {
    return NextResponse.json(
      { error: "Send a photo, tapped measurement, or a foot length in mm." },
      { status: 400 }
    );
  }

  if (!isPlausibleFoot(lengthMm!)) {
    return NextResponse.json(
      {
        error: `${lengthMm} mm isn't a plausible foot length. Check the reference object and try again.`,
        lengthMm,
        source,
        confidence
      },
      { status: 422 }
    );
  }

  const toleranceMm = toleranceFor(source, confidence);
  const quality = fitQuality(source, confidence);
  const sizeIsReliable = quality !== "unusable";

  // Width is genuinely hard to read from a photo; fall back to a typical ratio
  // and say so rather than inventing a precise-looking number.
  const widthEstimated = widthMm === null;
  const effectiveWidth = widthMm ?? Math.round(lengthMm! * 0.38);

  const sizes = mmToSizes(lengthMm!, effectiveWidth, audience, toleranceMm);

  const session = await getSession();
  await logEvent({
    type: "foot_scan",
    userId: session?.userId ?? null,
    visitorId: readVisitorId(),
    meta: `source=${source};len=${lengthMm};conf=${confidence.toFixed(2)}`
  });

  return NextResponse.json({
    lengthMm,
    widthMm: effectiveWidth,
    widthEstimated,
    archType,
    confidence,
    source,
    toleranceMm,
    quality,
    sizeIsReliable,
    minConfidence: MIN_CONFIDENCE_FOR_SIZE,
    audience,
    sizes,
    note,
    aiUsed: source === "ai"
  });
}
