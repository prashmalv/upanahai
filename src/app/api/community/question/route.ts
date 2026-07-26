import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, readVisitorId } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in to post a question" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();

  if (title.length < 10) {
    return NextResponse.json(
      { error: "Give your question a clear title (10+ characters)" },
      { status: 400 }
    );
  }
  if (text.length < 20) {
    return NextResponse.json(
      { error: "Add some detail so people can actually help (20+ characters)" },
      { status: 400 }
    );
  }

  const budget = Number(body.budget);

  const q = await prisma.question.create({
    data: {
      userId: session.userId,
      kind: body.kind === "advice" ? "advice" : "find",
      title: title.slice(0, 200),
      body: text.slice(0, 4000),
      brand: String(body.brand || "").trim().slice(0, 60),
      category: String(body.category || "").trim().slice(0, 40),
      city: String(body.city || "").trim().slice(0, 80),
      budget: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : null
    }
  });

  await logEvent({
    type: "question",
    userId: session.userId,
    visitorId: readVisitorId(),
    meta: q.kind
  });

  return NextResponse.json({ ok: true, id: q.id });
}
