import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isFootwearChange, isPainChange } from "@/lib/outcomes";

export const dynamic = "force-dynamic";

/**
 * The four-week follow-up.
 *
 * GET returns the one episode that is due, or null. POST records the answer, or a
 * dismissal if the user would rather not say. A dismissal is stored as its own
 * thing rather than as "no change" — guessing on someone's behalf is exactly how
 * an outcome number stops meaning anything.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ episode: null });

  const episode = await prisma.careEpisode.findFirst({
    where: {
      userId: session.userId,
      followUpAt: null,
      dismissedAt: null,
      followUpDueAt: { lte: new Date() }
    },
    orderBy: { followUpDueAt: "asc" },
    select: {
      id: true,
      startedAt: true,
      baselinePainDays: true,
      baselinePainAreas: true,
      needs: true
    }
  });

  return NextResponse.json({ episode });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as any);
  const id = String(body.episodeId || "");
  if (!id) return NextResponse.json({ error: "Which follow-up?" }, { status: 400 });

  // Scope the lookup to the session's own episodes — an episode id in a request
  // body is not authorisation to write to it.
  const episode = await prisma.careEpisode.findFirst({
    where: { id, userId: session.userId, followUpAt: null, dismissedAt: null }
  });
  if (!episode) {
    return NextResponse.json({ error: "That follow-up is not open." }, { status: 404 });
  }

  if (body.dismiss) {
    await prisma.careEpisode.update({
      where: { id },
      data: { dismissedAt: new Date() }
    });
    return NextResponse.json({ ok: true, dismissed: true });
  }

  if (!isPainChange(body.painChange) || !isFootwearChange(body.changedFootwear)) {
    return NextResponse.json(
      { error: "Please answer both questions, or skip." },
      { status: 400 }
    );
  }

  const rating = Number(body.comfortRating);
  await prisma.careEpisode.update({
    where: { id },
    data: {
      followUpAt: new Date(),
      painChange: body.painChange,
      changedFootwear: body.changedFootwear,
      comfortRating: rating >= 1 && rating <= 5 ? Math.round(rating) : null,
      note: String(body.note || "").slice(0, 500)
    }
  });

  return NextResponse.json({ ok: true });
}
