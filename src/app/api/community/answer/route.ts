import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, readVisitorId } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in to answer" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const questionId = String(body.questionId || "");
  const text = String(body.body || "").trim();

  if (!questionId) return NextResponse.json({ error: "Missing question" }, { status: 400 });
  if (text.length < 10) {
    return NextResponse.json(
      { error: "Write a real answer (10+ characters)" },
      { status: 400 }
    );
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  if (question.status === "closed") {
    return NextResponse.json({ error: "This question is closed" }, { status: 409 });
  }

  const answer = await prisma.answer.create({
    data: {
      questionId,
      userId: session.userId,
      body: text.slice(0, 4000),
      // Stamped from the session, never from the request body — otherwise any
      // shopper could badge their answer as an official brand reply.
      brandName: session.role === "brand" ? session.brandName || "" : ""
    }
  });

  // First answer flips the thread to "answered" so the asker sees movement and
  // the community list can surface unanswered questions.
  if (question.status === "open") {
    await prisma.question.update({
      where: { id: questionId },
      data: { status: "answered" }
    });
  }

  await logEvent({
    type: "answer",
    userId: session.userId,
    visitorId: readVisitorId(),
    meta: session.role === "brand" ? `brand:${session.brandName}` : "community"
  });

  return NextResponse.json({ ok: true, id: answer.id });
}
