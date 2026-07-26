import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { productId, rating, fitFeedback, authorName, comment } = await req.json();
  if (!productId || !comment) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const session = await getSession();

  const fb = await prisma.feedback.create({
    data: {
      productId,
      userId: session?.userId ?? null,
      authorName: authorName || session?.name || "Anonymous",
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      fitFeedback: fitFeedback || "true-to-size",
      comment: String(comment).slice(0, 1000)
    }
  });

  // Nudge the aggregate review count so the new review is reflected without
  // clobbering the historical rating baseline.
  await prisma.product.update({
    where: { id: productId },
    data: { reviewCount: { increment: 1 } }
  });

  return NextResponse.json({ ok: true, id: fb.id });
}
