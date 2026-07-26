import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Marks an answer helpful. Requires an account so the count means something. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  const { answerId } = await req.json().catch(() => ({} as any));
  if (!answerId) return NextResponse.json({ error: "Missing answer" }, { status: 400 });

  const answer = await prisma.answer.findUnique({ where: { id: String(answerId) } });
  if (!answer) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  if (answer.userId === session.userId) {
    return NextResponse.json({ error: "You can't mark your own answer helpful" }, { status: 403 });
  }

  const updated = await prisma.answer.update({
    where: { id: answer.id },
    data: { helpful: { increment: 1 } },
    select: { helpful: true }
  });

  return NextResponse.json({ ok: true, helpful: updated.helpful });
}
