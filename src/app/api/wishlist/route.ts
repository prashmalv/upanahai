import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { productId } = await req.json();
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: session.userId, productId } }
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }
  await prisma.wishlist.create({ data: { userId: session.userId, productId } });
  return NextResponse.json({ saved: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] });
  const items = await prisma.wishlist.findMany({
    where: { userId: session.userId },
    include: { product: { include: { offers: true } } }
  });
  return NextResponse.json({ items });
}
