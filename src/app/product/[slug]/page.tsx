import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { StarRating } from "@/components/StarRating";
import { WishlistButton } from "@/components/WishlistButton";
import { FeedbackForm } from "@/components/FeedbackForm";
import { JsonLd } from "@/components/JsonLd";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getBrandSizeAdvice } from "@/lib/brandFit";
import { ExternalLink, Truck, BadgeCheck, Sparkles, Ruler } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { offers: { orderBy: { price: "asc" }, take: 1 } }
  });
  if (!p) return { title: "Footwear not found" };

  const lowest = p.offers[0]?.price ?? p.basePrice;
  const title = `${p.brand} ${p.name} — Price, Fit & Reviews`;
  const description =
    `${p.brand} ${p.name}: best price ₹${lowest.toLocaleString("en-IN")} compared across Indian retailers, ` +
    `rated ${p.rating}/5 from ${p.reviewCount.toLocaleString("en-IN")} reviews. ` +
    `See real fit feedback, arch support and cushioning scores, then buy from the retailer you trust.`;

  return {
    title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${p.slug}`,
      images: [{ url: p.imageUrl, alt: `${p.brand} ${p.name}` }]
    },
    twitter: { card: "summary_large_image", title, description, images: [p.imageUrl] }
  };
}

const ATTRS: { key: string; label: string }[] = [
  { key: "archSupport", label: "Arch support" },
  { key: "cushioning", label: "Cushioning" },
  { key: "grip", label: "Grip" },
  { key: "breathability", label: "Breathability" }
];

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { offers: { orderBy: { price: "asc" } }, feedback: { orderBy: { createdAt: "desc" } } }
  });
  if (!p) notFound();

  const session = await getSession();
  const inWishlist = session
    ? !!(await prisma.wishlist.findUnique({
        where: { userId_productId: { userId: session.userId, productId: p.id } }
      }))
    : false;

  // Personal size advice for this brand: the shopper's own measured size,
  // corrected by what real buyers said about how this brand's sizing runs.
  const foot = session
    ? await prisma.footProfile.findUnique({ where: { userId: session.userId } })
    : null;
  const brandAdvice = await getBrandSizeAdvice(p.brand, foot?.ukSize ?? null);

  const lowest = p.offers[0]?.price ?? p.basePrice;
  const fitCounts = p.feedback.reduce(
    (a, f) => ((a[f.fitFeedback] = (a[f.fitFeedback] || 0) + 1), a),
    {} as Record<string, number>
  );

  return (
    <div className="container-app py-8">
      <JsonLd
        data={[
          productJsonLd(p),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: p.category, path: `/search?category=${p.category}` },
            { name: `${p.brand} ${p.name}`, path: `/product/${p.slug}` }
          ])
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="card relative overflow-hidden">
          <div className="absolute right-3 top-3 z-10"><WishlistButton productId={p.id} initial={inWishlist} /></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt={`${p.brand} ${p.name}`} className="aspect-square w-full object-cover" />
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{p.brand}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">{p.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StarRating value={p.rating} size={16} />
            <span className="text-sm text-slate-500">{p.reviewCount.toLocaleString("en-IN")} reviews</span>
            <span className="chip">{p.category}</span>
          </div>
          <p className="mt-4 text-slate-600">{p.description}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/foot-scan" className="btn-ghost">Check my size</Link>
            <Link href={`/try-on?product=${p.slug}`} className="btn-ghost"><Sparkles size={15} /> Try it on</Link>
          </div>

          {/* Support attributes */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {ATTRS.map((a) => {
              const v = (p as any)[a.key] as number;
              return (
                <div key={a.key} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{a.label}</span>
                    <span className="font-semibold text-slate-900">{v}/5</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(v / 5) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fit summary */}
          <div className="mt-6 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
            <p className="text-sm font-semibold text-brand-900">Fit feedback from buyers</p>
            <div className="mt-2 flex gap-4 text-sm text-brand-800">
              <span>Small: {fitCounts["small"] || 0}</span>
              <span>True to size: {fitCounts["true-to-size"] || 0}</span>
              <span>Large: {fitCounts["large"] || 0}</span>
            </div>
          </div>

          {/* What size to actually buy in THIS brand */}
          {brandAdvice && (
            <div
              className={`mt-4 rounded-xl p-4 ring-1 ${
                brandAdvice.adjustment !== 0
                  ? "bg-amber-50 text-amber-900 ring-amber-200"
                  : "bg-slate-50 text-slate-700 ring-slate-200"
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Ruler size={15} /> {p.brand} sizing
              </p>
              <p className="mt-1.5 text-sm">{brandAdvice.message}</p>
              {foot && brandAdvice.suggestedUk !== null && (
                <p className="mt-2 text-sm">
                  Your measured size is <strong>UK {foot.ukSize}</strong>
                  {brandAdvice.adjustment !== 0 ? (
                    <>
                      {" "}— for {p.brand} we&apos;d pick{" "}
                      <strong>UK {brandAdvice.suggestedUk}</strong>.
                    </>
                  ) : (
                    <> — stick with it for {p.brand}.</>
                  )}
                </p>
              )}
              {!foot && (
                <p className="mt-2 text-sm">
                  <Link href="/foot-scan" className="font-semibold underline">
                    Measure your foot
                  </Link>{" "}
                  and we&apos;ll turn this into an exact size for you.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price comparison — Trivago style */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-slate-900">Compare prices across retailers</h2>
        <p className="text-sm text-slate-500">Best price today: <span className="font-semibold text-slate-900">₹{lowest.toLocaleString("en-IN")}</span></p>
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          {p.offers.map((o, i) => (
            <div
              key={o.id}
              className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                i % 2 ? "bg-white" : "bg-slate-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white font-bold text-brand-600 ring-1 ring-slate-200">
                  {o.retailer[0]}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{o.retailer}</p>
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <StarRating value={o.retailerRating} size={11} />
                    <span className="inline-flex items-center gap-1"><Truck size={12} /> {o.deliveryDays}d delivery</span>
                    {o.inStock ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600"><BadgeCheck size={12} /> In stock</span>
                    ) : (
                      <span className="text-rose-500">Out of stock</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-extrabold text-slate-900">₹{o.price.toLocaleString("en-IN")}</p>
                  {i === 0 && <span className="text-xs font-semibold text-emerald-600">Lowest</span>}
                </div>
                <a
                  href={`/api/go?url=${encodeURIComponent(o.url)}&pid=${p.id}&r=${encodeURIComponent(o.retailer)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Buy <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Upanah.AI links you to the retailer&apos;s site. Prices &amp; availability are indicative and may change.
        </p>
      </section>

      {/* Reviews + feedback */}
      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Buyer reviews</h2>
          <div className="mt-4 space-y-3">
            {p.feedback.length === 0 && <p className="text-sm text-slate-500">No reviews yet. Be the first!</p>}
            {p.feedback.map((f) => (
              <div key={f.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{f.authorName}</span>
                  <StarRating value={f.rating} />
                </div>
                <p className="mt-1 text-xs text-slate-400">Fit: {f.fitFeedback.replace("-", " ")}</p>
                <p className="mt-2 text-sm text-slate-600">{f.comment}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Share your feedback</h2>
          <p className="text-sm text-slate-500">Genuine feedback helps other buyers find their fit.</p>
          <FeedbackForm productId={p.id} />
        </div>
      </section>
    </div>
  );
}
