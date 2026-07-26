import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeShoeImage, aiEnabled, type ShoeMatch } from "@/lib/ai";
import { scoreByImageMatch } from "@/lib/recommender";
import { toCard, DISPLAYABLE } from "@/lib/products";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { imageDataUrl } = await req.json();
  if (!imageDataUrl) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  let detected: ShoeMatch | null = aiEnabled ? await analyzeShoeImage(imageDataUrl) : null;

  // Fallback: generic match so results always appear.
  if (!detected) {
    detected = {
      keywords: ["casual", "sneaker", "everyday"],
      description: "Similar styles based on popular footwear.",
      category: undefined
    };
  }

  const all = await prisma.product.findMany({ where: DISPLAYABLE, include: { offers: true } });
  const ranked = scoreByImageMatch(all, detected).slice(0, 9);

  return NextResponse.json({
    detected: { brand: detected.brand, category: detected.category, description: detected.description },
    matches: ranked.map((r) => toCard(r.product, r.reasons)),
    aiUsed: aiEnabled && !!detected.brand
  });
}
