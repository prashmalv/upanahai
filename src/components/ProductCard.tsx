"use client";

import { useState } from "react";
import Link from "next/link";
import { StarRating } from "./StarRating";
import { WishlistButton } from "./WishlistButton";
import { ProductImage } from "./ProductImage";

export type ProductCardData = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  imageUrl: string;
  category: string;
  rating: number;
  reviewCount: number;
  lowestPrice: number;
  basePrice: number;
  reasons?: string[];
};

export function ProductCard({ p, inWishlist = false }: { p: ProductCardData; inWishlist?: boolean }) {
  // A product is never shown without its picture. The catalog query already
  // excludes known-bad images; this handles one that dies mid-session.
  const [imageDead, setImageDead] = useState(false);
  if (imageDead) return null;

  const discount = p.basePrice > p.lowestPrice
    ? Math.round(((p.basePrice - p.lowestPrice) / p.basePrice) * 100)
    : 0;

  return (
    <div className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Link href={`/product/${p.slug}`}>
          <ProductImage
            src={p.imageUrl}
            alt={`${p.brand} ${p.name}`}
            onHidden={() => setImageDead(true)}
          />
        </Link>
        <div className="absolute left-2 top-2">
          <WishlistButton productId={p.id} initial={inWishlist} />
        </div>
        {discount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
            {discount}% off
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{p.brand}</span>
          <span className="chip">{p.category}</span>
        </div>
        <Link href={`/product/${p.slug}`}>
          <h3 className="mt-1 line-clamp-1 font-semibold text-slate-900 hover:text-brand-700">{p.name}</h3>
        </Link>
        <div className="mt-1">
          <StarRating value={p.rating} />
          <span className="ml-1 text-xs text-slate-400">({p.reviewCount})</span>
        </div>
        {p.reasons && p.reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.reasons.map((r) => (
              <span key={r} className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                ✓ {r}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-lg font-extrabold text-slate-900">₹{p.lowestPrice.toLocaleString("en-IN")}</span>
            {discount > 0 && (
              <span className="ml-2 text-sm text-slate-400 line-through">₹{p.basePrice.toLocaleString("en-IN")}</span>
            )}
          </div>
          <Link href={`/product/${p.slug}`} className="text-sm font-semibold text-brand-600 hover:underline">
            Compare →
          </Link>
        </div>
      </div>
    </div>
  );
}
