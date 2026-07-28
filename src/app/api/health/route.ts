import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { screen } from "@/lib/footHealth";
import { baselineFrom, shouldOpenEpisode } from "@/lib/outcomes";

export const dynamic = "force-dynamic";

/**
 * Activity and symptom log, plus the screening derived from it.
 *
 * Writing requires recorded health consent (see /api/health-consent). The gate is
 * enforced here and not only in the UI: a consent checkbox the server doesn't
 * check isn't consent, it's decoration.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ logs: [], consented: false });

  const [user, logs, foot] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { healthConsentAt: true, persona: true, diabetesDeclared: true }
    }),
    prisma.healthLog.findMany({
      where: { userId: session.userId },
      orderBy: { date: "desc" },
      take: 60
    }),
    prisma.footProfile.findUnique({ where: { userId: session.userId } })
  ]);

  const screening = screen({
    lengthMm: foot?.lengthMm ?? null,
    widthMm: foot?.widthMm ?? null,
    archType: foot?.archType ?? null,
    widthCategory: foot?.widthCategory ?? null,
    persona: user?.persona ?? null,
    diabetes: !!user?.diabetesDeclared,
    logs: logs.map((l) => ({
      date: l.date,
      steps: l.steps,
      distanceKm: l.distanceKm,
      activity: l.activity,
      painArea: l.painArea,
      numbness: l.numbness,
      woundOrSore: l.woundOrSore,
      swelling: l.swelling
    }))
  });

  // Open a care episode the first time we give this person real guidance while
  // they are logging pain. It has to happen here, where the guidance is produced,
  // because the baseline is only meaningful at that moment — reconstructing it
  // later from the logs would let subsequent entries move the starting line.
  //
  // One open episode at a time: re-asking every visit would produce a pile of
  // overlapping four-week windows and no interpretable answer.
  if (user?.healthConsentAt && shouldOpenEpisode(screening)) {
    const open = await prisma.careEpisode.count({
      where: { userId: session.userId, followUpAt: null, dismissedAt: null }
    });
    if (open === 0) {
      await prisma.careEpisode.create({
        data: { userId: session.userId, ...baselineFrom(screening, foot, new Date()) }
      });
    }
  }

  return NextResponse.json({
    consented: !!user?.healthConsentAt,
    logs: logs.slice(0, 30),
    screening,
    hasFootProfile: !!foot
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { healthConsentAt: true }
  });
  if (!user?.healthConsentAt) {
    return NextResponse.json(
      {
        error: "Health logging needs your consent first — see the notice on the health page.",
        needsConsent: true
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const log = await prisma.healthLog.create({
    data: {
      userId: session.userId,
      // Clamped: a typo of 2000000 steps would otherwise distort every average
      // this person sees for the next month.
      steps: Math.max(0, Math.min(200_000, Number(body.steps) || 0)),
      distanceKm: Math.max(0, Math.min(200, Number(body.distanceKm) || 0)),
      activity: ["walk", "run", "gym", "standing"].includes(body.activity)
        ? body.activity
        : "walk",
      painArea: ["heel", "arch", "forefoot", "knee", "none"].includes(body.painArea)
        ? body.painArea
        : "",
      numbness: !!body.numbness,
      woundOrSore: !!body.woundOrSore,
      swelling: !!body.swelling
    }
  });

  return NextResponse.json({ ok: true, log });
}
