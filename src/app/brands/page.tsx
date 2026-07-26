import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { DISPLAYABLE } from "@/lib/products";
import { StarRating } from "@/components/StarRating";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/seo";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Footwear Brand Ratings & Honest Reviews in India",
  description:
    "Neutral, shopper-written ratings for footwear brands sold in India — build quality, comfort, durability, value for money and whether their sizing runs small or large. No retailer influence.",
  keywords: [
    "footwear brand reviews India",
    "which shoe brand is best India",
    "Nike vs Adidas sizing",
    "shoe brand comfort rating",
    "honest shoe brand feedback"
  ],
  alternates: { canonical: "/brands" }
};

export default async function BrandsPage() {
  const [products, reviews] = await Promise.all([
    prisma.product.groupBy({
      by: ["brand"],
      where: DISPLAYABLE,
      _count: { _all: true },
      _avg: { rating: true }
    }),
    prisma.brandFeedback.findMany({
      select: { brand: true, rating: true, sizingAccuracy: true }
    })
  ]);

  const brands = products
    .map((p) => {
      const own = reviews.filter((r) => r.brand === p.brand);
      const communityRating = own.length
        ? Number((own.reduce((s, r) => s + r.rating, 0) / own.length).toFixed(1))
        : 0;
      const sizingCounts = own.reduce<Record<string, number>>((a, r) => {
        a[r.sizingAccuracy] = (a[r.sizingAccuracy] || 0) + 1;
        return a;
      }, {});
      const sizingVerdict =
        Object.entries(sizingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      return {
        brand: p.brand,
        products: p._count._all,
        catalogRating: Number((p._avg.rating || 0).toFixed(1)),
        communityRating,
        communityReviews: own.length,
        sizingVerdict
      };
    })
    .sort((a, b) => b.communityReviews - a.communityReviews || a.brand.localeCompare(b.brand));

  return (
    <div className="container-app py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Footwear brand ratings in India",
          description: metadata.description as string,
          url: `${SITE.url}/brands`
        }}
      />

      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <ShieldCheck size={14} /> Neutral ratings
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Footwear brands, rated by shoppers — not by sellers
        </h1>
        <p className="mt-3 text-slate-600">
          Retailer star ratings measure a listing. These ratings measure the
          <strong className="font-semibold text-slate-900"> brand</strong>: does it
          last, is it comfortable after a month, and does its sizing actually run
          true? Written by people who bought the shoes, on a platform that earns
          nothing from pushing you to a costlier store.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <Link
            key={b.brand}
            href={`/brands/${encodeURIComponent(b.brand)}`}
            className="card group flex flex-col justify-between p-5 transition hover:-translate-y-1"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-extrabold text-slate-900">{b.brand}</h2>
                <ArrowRight
                  size={16}
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600"
                />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {b.products} {b.products === 1 ? "model" : "models"} listed
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {b.communityReviews > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <StarRating value={b.communityRating} size={15} />
                    <span className="text-xs text-slate-500">
                      {b.communityReviews} brand{" "}
                      {b.communityReviews === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                  {b.sizingVerdict && (
                    <p className="text-xs text-slate-500">
                      Sizing runs:{" "}
                      <span className="font-semibold text-slate-700">
                        {b.sizingVerdict.replace(/-/g, " ")}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  No brand reviews yet — be the first.
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
