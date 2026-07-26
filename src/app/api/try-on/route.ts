import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Virtual Try-On.
 * If VTON_API_URL is configured (e.g. an Azure ML endpoint hosting a try-on
 * model), we forward the user photo + garment/shoe image and return the
 * generated image. Otherwise we return a note and let the client render an
 * in-browser overlay preview.
 */
export async function POST(req: NextRequest) {
  const { userPhoto, productId, outfit } = await req.json();
  if (!userPhoto || !productId) {
    return NextResponse.json({ error: "Missing photo or product" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const vtonUrl = process.env.VTON_API_URL;
  if (vtonUrl) {
    try {
      const res = await fetch(vtonUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.VTON_API_KEY ? { Authorization: `Bearer ${process.env.VTON_API_KEY}` } : {})
        },
        body: JSON.stringify({
          person_image: userPhoto,
          garment_image: product.imageUrl,
          category: "shoes",
          context: outfit
        })
      });
      const data = await res.json();
      // Expecting { image: "data:image/...;base64,..." } or { url }
      const image = data.image || data.url || null;
      if (image) return NextResponse.json({ image, note: `Rendered with ${product.brand} ${product.name} · ${outfit} look.` });
    } catch (e) {
      console.error("[vton] endpoint failed:", (e as Error).message);
    }
  }

  return NextResponse.json({
    image: null,
    note:
      "Preview shown using an in-browser overlay. Connect a VTON model via VTON_API_URL for a photorealistic try-on render."
  });
}
