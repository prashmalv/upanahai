import { prisma } from "./db";
import type { ProductCardData } from "@/components/ProductCard";

/**
 * Every listing query goes through DISPLAYABLE. A product whose image can't be
 * shown is removed from the catalog surface rather than rendered as an empty
 * box — prisma/validate-images.ts maintains the flag.
 *
 * Import and spread this into any new product query instead of writing
 * `imageOk: true` by hand, so the rule can't be forgotten in one place.
 */
export const DISPLAYABLE = { imageOk: true } as const;

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
    lowestPrice,
    basePrice: p.basePrice,
    reasons
  };
}

export async function getFeatured(limit = 8) {
  const products = await prisma.product.findMany({
    where: DISPLAYABLE,
    include: { offers: true },
    orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
    take: limit
  });
  return products.map((p) => toCard(p));
}

export async function getByPersona(persona: string, limit = 4) {
  const products = await prisma.product.findMany({
    where: { ...DISPLAYABLE, suitsPersonas: { contains: persona } },
    include: { offers: true },
    orderBy: { rating: "desc" },
    take: limit
  });
  return products.map((p) => toCard(p));
}
