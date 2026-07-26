import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DISPLAYABLE } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  // Same rule as every listing surface: nothing without a working image.
  const products = await prisma.product.findMany({
    where: DISPLAYABLE,
    select: { id: true, slug: true, brand: true, name: true, imageUrl: true, category: true },
    orderBy: { rating: "desc" }
  });
  return NextResponse.json({ products });
}
