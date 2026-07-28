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
import {
  brandBySlug, slugify, CATEGORY_LABEL, PRICE_BANDS, BRAND_DIRECTORY
} from "@/lib/brandDirectory";
import { ArrowUpRight, MapPin, Globe, Info, Ruler } from "lucide-react";

export const dynamic = "force-dynamic";

const decode = (s: string) => decodeURIComponent(s);

/** Directory entry is the source of truth; the catalog is a bonus if present. */
function resolveBrand(param: string) {
  const raw = decode(param);
  return brandBySlug(raw) ?? brandBySlug(slugify(raw));
}

export async function generateMetadata({
  params
}: {
  params: { brand: string };
}): Promise<Metadata> {
  const dir = resolveBrand(params.brand);
  if (!dir) return { title: "Brand not found" };

  const agg = await prisma.brandFeedback.aggregate({
    where: { brand: dir.name },
    _avg: { rating: true },
    _count: true
  });
  const rating = agg._avg.rating ? agg._avg.rating.toFixed(1) : null;

  const title = `${dir.name} Shoes India — Honest Rating, Sizing & Official Store`;
  const description = rating
    ? `${dir.name} rated ${rating}/5 by ${agg._count} Upanah.AI shoppers on quality, comfort, durability and value, plus whether ${dir.name} sizing runs small or large. ${dir.knownFor}`
    : `${dir.name} in India: ${dir.knownFor} Starting around ₹${dir.fromPrice.toLocaleString("en-IN")}. Read shopper sizing verdicts and go straight to the official store.`;

  return {
    title,
    description,
    alternates: { canonical: `/brands/${slugify(dir.name)}` },
    openGraph: { title, description, url: `/brands/${slugify(dir.name)}` }
  };
}

export default async function BrandPage({ params }: { params: { brand: string } }) {
  const dir = resolveBrand(params.brand);
  if (!dir) notFound();

  const [products, reviews, session] = await Promise.all([
    prisma.product.findMany({
      where: { ...DISPLAYABLE, brand: dir.name },
      include: { offers: true },
      take: 12
    }),
    prisma.brandFeedback.findMany({ where: { brand: dir.name }, orderBy: { createdAt: "desc" } }),
    getSession()
  ]);

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

  // Brands a shopper might weigh against this one: same price band, overlapping use.
  const alternatives = BRAND_DIRECTORY.filter(
    (b) =>
      b.name !== dir.name &&
      b.priceBand === dir.priceBand &&
      b.categories.some((c) => dir.categories.includes(c))
  ).slice(0, 6);

  const visitHref = `/api/brand-visit?b=${slugify(dir.name)}&from=brand-page`;

  return (
    <div className="container-app py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Brands", path: "/brands" },
            { name: dir.name, path: `/brands/${slugify(dir.name)}` }
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Brand",
            name: dir.name,
            description: dir.knownFor,
            url: `${SITE.url}/brands/${slugify(dir.name)}`,
            sameAs: [dir.url],
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
        <Link href="/brands" className="hover:text-brand-600">Brands</Link>{" "}
        / <span className="text-slate-700">{dir.name}</span>
      </nav>

      <div className="mt-3 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              {dir.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                dir.origin === "Indian"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {dir.origin === "Indian" ? <MapPin size={11} /> : <Globe size={11} />}
              {dir.origin === "Indian" ? "Made in India" : "Global brand"}
            </span>
          </div>

          <p className="mt-3 text-lg leading-relaxed text-slate-600">{dir.knownFor}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Typical price" value={PRICE_BANDS[dir.priceBand]} />
            <Fact label="Starts around" value={`₹${dir.fromPrice.toLocaleString("en-IN")}`} />
            <Fact label="Makes shoes for" value={dir.audiences.join(", ")} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {dir.categories.map((c) => (
              <Link key={c} href={`/brands?category=${c}`} className="chip hover:bg-brand-100">
                {CATEGORY_LABEL[c]}
              </Link>
            ))}
          </div>

          {dir.note && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
              <Info size={15} className="mt-0.5 shrink-0" />
              {dir.note}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={visitHref}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="btn-primary"
            >
              Visit {dir.name} store <ArrowUpRight size={15} />
            </a>
            <Link href={`/size-chart?brand=${encodeURIComponent(dir.name)}`} className="btn-ghost">
              <Ruler size={15} /> {dir.name} size chart
            </Link>
          </div>
          {!dir.indiaStore && (
            <p className="mt-2 text-xs text-slate-500">
              {dir.name} has no India-specific storefront we could verify — this goes
              to their global site. In India they&apos;re usually found on the large
              marketplaces.
            </p>
          )}

          {/* shopper verdict */}
          <div className="mt-8">
            <h2 className="text-lg font-black text-slate-900">What shoppers say</h2>
            {reviews.length ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <StarRating value={overall} size={20} />
                  <span className="text-sm text-slate-500">
                    {reviews.length} {reviews.length === 1 ? "review" : "reviews"} from
                    Upanah.AI shoppers
                  </span>
                </div>

                {sizingVerdict && (
                  <p className="mt-3 inline-flex rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-900 ring-1 ring-brand-100">
                    Most reviewers say {dir.name} sizing runs{" "}
                    <strong className="ml-1 font-semibold">
                      {sizingVerdict.replace(/-/g, " ")}
                    </strong>
                  </p>
                )}

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
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
              <p className="mt-2 text-slate-600">
                Nobody has reviewed {dir.name} yet. Your review will be the first
                data point the next shopper sees — and the first honest signal this
                brand gets from Upanah.AI.
              </p>
            )}
          </div>
        </div>

        <BrandReviewForm brand={dir.name} signedIn={!!session} existing={mine} />
      </div>

      {/* reviews */}
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-black text-slate-900">Reviews of {dir.name}</h2>
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
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.comment}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* catalog, when we happen to list this brand's models */}
      {products.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-black text-slate-900">{dir.name} models we track</h2>
          <p className="text-sm text-slate-500">Prices compared across retailers.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={toCard(p)} />
            ))}
          </div>
        </section>
      )}

      {/* alternatives */}
      {alternatives.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-black text-slate-900">
            Others worth comparing at this price
          </h2>
          <p className="text-sm text-slate-500">
            Same budget, overlapping use. Listed alphabetically — no brand pays for
            placement here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {alternatives.map((b) => (
              <Link key={b.name} href={`/brands/${slugify(b.name)}`} className="btn-ghost">
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold capitalize text-slate-900">{value}</dd>
    </div>
  );
}
