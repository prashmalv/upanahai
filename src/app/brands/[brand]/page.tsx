import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCard, DISPLAYABLE } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { StarRating } from "@/components/StarRating";
import { BrandReviewForm } from "@/components/BrandReviewForm";
import { JsonLd } from "@/components/JsonLd";
import { SITE, breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

const decode = (s: string) => decodeURIComponent(s);

export async function generateMetadata({
  params
}: {
  params: { brand: string };
}): Promise<Metadata> {
  const brand = decode(params.brand);
  const [agg, count] = await Promise.all([
    prisma.brandFeedback.aggregate({ where: { brand }, _avg: { rating: true }, _count: true }),
    prisma.product.count({ where: { brand } })
  ]);
  if (!count) return { title: `${brand} — not found` };

  const rating = agg._avg.rating ? agg._avg.rating.toFixed(1) : null;
  const title = `${brand} Shoes — Honest Brand Rating, Sizing & Reviews`;
  const description = rating
    ? `${brand} rated ${rating}/5 by ${agg._count} Upanah.AI shoppers on quality, comfort, durability and value — plus whether ${brand} sizing runs small or large, and prices compared across Indian retailers.`
    : `${brand} footwear on Upanah.AI: ${count} models with prices compared across Indian retailers, fit guidance, and honest shopper reviews of the brand.`;

  return {
    title,
    description,
    alternates: { canonical: `/brands/${encodeURIComponent(brand)}` },
    openGraph: { title, description, url: `/brands/${encodeURIComponent(brand)}` }
  };
}

export default async function BrandPage({ params }: { params: { brand: string } }) {
  const brand = decode(params.brand);

  const [products, reviews, session] = await Promise.all([
    prisma.product.findMany({
      where: { ...DISPLAYABLE, brand },
      include: { offers: true },
      take: 12
    }),
    prisma.brandFeedback.findMany({ where: { brand }, orderBy: { createdAt: "desc" } }),
    getSession()
  ]);

  if (products.length === 0) notFound();

  const avg = (ns: number[]) =>
    ns.length ? Number((ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(1)) : 0;
  const rated = (k: "quality" | "comfort" | "durability" | "valueScore") =>
    avg(reviews.map((r) => r[k]).filter((n) => n > 0));

  const overall = avg(reviews.map((r) => r.rating));
  const sizingCounts = reviews.reduce<Record<string, number>>((a, r) => {
    a[r.sizingAccuracy] = (a[r.sizingAccuracy] || 0) + 1;
    return a;
  }, {});
  const sizingVerdict = Object.entries(sizingCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const mine = session ? reviews.find((r) => r.userId === session.userId) : null;

  const ASPECTS = [
    { label: "Build quality", value: rated("quality") },
    { label: "Comfort", value: rated("comfort") },
    { label: "Durability", value: rated("durability") },
    { label: "Value for money", value: rated("valueScore") }
  ];

  return (
    <div className="container-app py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Brands", path: "/brands" },
            { name: brand, path: `/brands/${encodeURIComponent(brand)}` }
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Brand",
            name: brand,
            url: `${SITE.url}/brands/${encodeURIComponent(brand)}`,
            ...(reviews.length
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: overall,
                    reviewCount: reviews.length,
                    bestRating: 5,
                    worstRating: 1
                  }
                }
              : {})
          }
        ]}
      />

      <nav className="text-sm text-slate-500">
        <Link href="/brands" className="hover:text-brand-600">
          Brands
        </Link>{" "}
        / <span className="text-slate-700">{brand}</span>
      </nav>

      <div className="mt-3 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            {brand}
          </h1>

          {reviews.length ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <StarRating value={overall} size={20} />
                <span className="text-sm text-slate-500">
                  {reviews.length} brand {reviews.length === 1 ? "review" : "reviews"} from
                  Upanah.AI shoppers
                </span>
              </div>

              {sizingVerdict && (
                <p className="mt-4 inline-flex rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-900 ring-1 ring-brand-100">
                  Most reviewers say {brand} sizing runs{" "}
                  <strong className="ml-1 font-semibold">
                    {sizingVerdict.replace(/-/g, " ")}
                  </strong>
                </p>
              )}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {ASPECTS.map((a) => (
                  <div key={a.label} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-slate-600">{a.label}</dt>
                      <dd className="font-bold text-slate-900">
                        {a.value ? `${a.value}/5` : "—"}
                      </dd>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(a.value / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-3 text-slate-600">
              No one has reviewed {brand} as a brand yet. Your review will be the
              first data point other shoppers see.
            </p>
          )}
        </div>

        <BrandReviewForm brand={brand} signedIn={!!session} existing={mine} />
      </div>

      {/* reviews */}
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-black text-slate-900">
            What shoppers say about {brand}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <article key={r.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{r.authorName}</span>
                  <StarRating value={r.rating} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Sizing: {r.sizingAccuracy.replace(/-/g, " ")} ·{" "}
                  {r.createdAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.comment}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* catalog */}
      <section className="mt-12">
        <h2 className="text-xl font-black text-slate-900">{brand} on Upanah.AI</h2>
        <p className="text-sm text-slate-500">
          Prices compared across retailers — buy wherever it&apos;s cheapest.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={toCard(p)} />
          ))}
        </div>
      </section>
    </div>
  );
}
