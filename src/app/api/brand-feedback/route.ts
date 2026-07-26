import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, readVisitorId } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

const score = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : 0;
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  // Brand reviews require an account. Anonymous brand ratings would make the
  // scorecard trivially game-able, which defeats the point of a neutral platform.
  if (!session) {
    return NextResponse.json({ error: "Please sign in to review a brand" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const brand = String(body.brand || "").trim();
  const comment = String(body.comment || "").trim();
  const rating = score(body.rating);

  if (!brand) return NextResponse.json({ error: "Brand is required" }, { status: 400 });
  if (!rating) return NextResponse.json({ error: "Give an overall rating (1-5)" }, { status: 400 });
  if (comment.length < 10) {
    return NextResponse.json(
      { error: "Please write at least a short sentence (10+ characters)" },
      { status: 400 }
    );
  }

  // One review per person per brand keeps the average honest; a repeat submit
  // updates their existing review instead of stacking duplicates.
  const existing = await prisma.brandFeedback.findFirst({
    where: { brand, userId: session.userId }
  });

  const data = {
    brand,
    userId: session.userId,
    authorName: session.name || session.email.split("@")[0],
    rating,
    quality: score(body.quality),
    comfort: score(body.comfort),
    durability: score(body.durability),
    valueScore: score(body.valueScore),
    sizingAccuracy: ["small", "true-to-size", "large"].includes(body.sizingAccuracy)
      ? body.sizingAccuracy
      : "true-to-size",
    comment: comment.slice(0, 2000)
  };

  const saved = existing
    ? await prisma.brandFeedback.update({ where: { id: existing.id }, data })
    : await prisma.brandFeedback.create({ data });

  await logEvent({
    type: "brand_review",
    userId: session.userId,
    visitorId: readVisitorId(),
    meta: brand
  });

  return NextResponse.json({ ok: true, id: saved.id, updated: !!existing });
}
