import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureVisitorId, readVisitorId } from "@/lib/auth";
import { SURVEY, surveyResults } from "@/lib/buyerSurvey";

export const dynamic = "force-dynamic";

/**
 * Record one answer and hand back what everyone else said.
 *
 * The result comes back with the answer because that is the whole exchange: you
 * tell us what you do, we tell you what India does. A survey that thanks you and
 * closes gets abandoned halfway.
 *
 * Answers are keyed on the visitor cookie and upserted, so changing your mind
 * moves your vote rather than adding a second one. That is what keeps a
 * percentage meaning "of people" rather than "of taps".
 */
export async function POST(req: NextRequest) {
  const { question, choice } = await req.json().catch(() => ({}) as any);

  const q = SURVEY.find((x) => x.key === question);
  if (!q) return NextResponse.json({ error: "Unknown question" }, { status: 400 });
  if (!q.choices.some((c) => c.key === choice)) {
    return NextResponse.json({ error: "Unknown option" }, { status: 400 });
  }

  // Issue the anonymous id here rather than reading one. It is otherwise only
  // minted by the page-view tracker, which runs client-side — so a first-time
  // visitor who answered before that fired was told to enable cookies they already
  // had. It is the same first-party id used everywhere else: no name, no email.
  const visitorId = ensureVisitorId();

  const session = await getSession();
  await prisma.surveyAnswer.upsert({
    where: { visitorId_question: { visitorId, question } },
    update: { choice, userId: session?.userId ?? null },
    create: { visitorId, question, choice, userId: session?.userId ?? null }
  });

  const [result] = await surveyResults(question);
  return NextResponse.json({ ok: true, result });
}

/** Everything answered so far, plus which of them this visitor has already done. */
export async function GET() {
  const visitorId = readVisitorId();
  const [results, mine] = await Promise.all([
    surveyResults(),
    visitorId
      ? prisma.surveyAnswer.findMany({
          where: { visitorId },
          select: { question: true, choice: true }
        })
      : Promise.resolve([])
  ]);
  return NextResponse.json({
    results,
    mine: Object.fromEntries(mine.map((m) => [m.question, m.choice]))
  });
}
