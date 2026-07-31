import { prisma } from "./db";
import type { ProductCardData } from "@/components/ProductCard";

/**
 * Every listing query goes through DISPLAYABLE. A product is shown only when
 * BOTH image gates pass:
 *
 *   imageOk        — the URL still serves an image (prisma/validate-images.ts)
 *   imageBrandSafe — it is footwear, with no competitor's brand mark on it
 *                    (prisma/audit-images.ts)
 *
 * Import and spread this into any new product query rather than writing the
 * conditions by hand, so a new listing surface can't quietly skip a gate.
 */
export const DISPLAYABLE = { imageOk: true, imageBrandSafe: true } as const;

export function toCard(p: any, reasons?: string[]): ProductCardData {
  const lowestPrice = p.offers?.length
    ? Math.min(...p.offers.map((o: any) => o.price))
    : p.basePrice;
  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    imageUrl: p.imageUrl,
    category: p.category,
    rating: p.rating,
    reviewCount: p.reviewCount,
    sourcedFrom: p.sourcedFrom ?? "",
    lowestPrice,
    basePrice: p.basePrice,
    reasons
  };
}

/**
 * The home page rail.
 *
 * It used to order by rating, which was ordering by the demo seed's invented
 * ratings — "Top rated right now" was a ranking of numbers nobody had earned. Real
 * ratings now exist only where a shopper has left one, so the rail leads with
 * genuinely reviewed products and fills the rest with the newest listings we read
 * from the brands. The caller decides what to call it; this function no longer
 * pretends the order means "best".
 */
export async function getFeatured(limit = 8) {
  const reviewed = await prisma.product.findMany({
    where: { ...DISPLAYABLE, reviewCount: { gt: 0 } },
    include: { offers: true },
    orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
    take: limit
  });
  if (reviewed.length >= limit) return reviewed.map((p) => toCard(p));

  const fill = await prisma.product.findMany({
    where: {
      ...DISPLAYABLE,
      reviewCount: 0,
      id: { notIn: reviewed.map((r) => r.id) }
    },
    include: { offers: true },
    orderBy: [{ sourcedAt: "desc" }, { createdAt: "desc" }],
    take: limit - reviewed.length
  });
  return [...reviewed, ...fill].map((p) => toCard(p));
}

export async function getByPersona(persona: string, limit = 4) {
  const products = await prisma.product.findMany({
    where: { ...DISPLAYABLE, suitsPersonas: { contains: persona } },
    include: { offers: true },
    // Not by rating: see getFeatured. Newest read first, so the rail changes as
    // the brands' own catalogues do.
    orderBy: [{ sourcedAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });
  return products.map((p) => toCard(p));
}
