import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StarRating } from "@/components/StarRating";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/seo";
import {
  BRAND_DIRECTORY, filterBrands, slugify, ALL_CATEGORIES,
  CATEGORY_LABEL, PRICE_BANDS,
  type BrandCategory, type PriceBand
} from "@/lib/brandDirectory";
import { ArrowUpRight, ShieldCheck, MapPin, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Footwear Brands in India — Directory, Honest Ratings & Official Links",
  description:
    "Every major footwear brand sold in India in one place — leather formals to sneakers, ₹199 slippers to premium boots, for men, women and kids. Filter by what you actually need, read neutral shopper ratings, then go straight to the brand's own store.",
  keywords: [
    "footwear brands India list",
    "best shoe brands India",
    "leather shoe brands India",
    "sneaker brands India",
    "kids shoe brands India",
    "affordable footwear brands India",
    "comfort shoe brands India",
    "shoe brand official website India"
  ],
  alternates: { canonical: "/brands" }
};

const AUDIENCES = ["men", "women", "kids"] as const;
const ORIGINS = ["Indian", "Global"] as const;

export default async function BrandsPage({
  searchParams
}: {
  searchParams: { category?: string; audience?: string; price?: string; origin?: string };
}) {
  const category = ALL_CATEGORIES.includes(searchParams.category as BrandCategory)
    ? (searchParams.category as BrandCategory)
    : undefined;
  const audience = (AUDIENCES as readonly string[]).includes(searchParams.audience || "")
    ? (searchParams.audience as "men" | "women" | "kids")
    : undefined;
  const priceBand = (["value", "mid", "premium"] as string[]).includes(searchParams.price || "")
    ? (searchParams.price as PriceBand)
    : undefined;
  const origin = (ORIGINS as readonly string[]).includes(searchParams.origin || "")
    ? (searchParams.origin as "Indian" | "Global")
    : undefined;

  const brands = filterBrands({ category, audience, priceBand, origin });

  // Shopper verdicts from our own reviews, keyed by brand name.
  const reviews = await prisma.brandFeedback.findMany({
    select: { brand: true, rating: true, sizingAccuracy: true }
  });
  const stats = new Map<string, { rating: number; count: number; sizing: string }>();
  for (const b of BRAND_DIRECTORY) {
    const own = reviews.filter((r) => r.brand === b.name);
    if (!own.length) continue;
    const counts = own.reduce<Record<string, number>>((a, r) => {
      a[r.sizingAccuracy] = (a[r.sizingAccuracy] || 0) + 1;
      return a;
    }, {});
    stats.set(b.name, {
      rating: Number((own.reduce((s, r) => s + r.rating, 0) / own.length).toFixed(1)),
      count: own.length,
      sizing: Object.entries(counts).sort((a, b2) => b2[1] - a[1])[0]?.[0] || ""
    });
  }

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { category, audience, price: priceBand, origin, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/brands?${s}` : "/brands";
  };

  const anyFilter = category || audience || priceBand || origin;

  return (
    <div className="container-app py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Footwear brands in India",
          description: metadata.description as string,
          url: `${SITE.url}/brands`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: BRAND_DIRECTORY.length,
            itemListElement: BRAND_DIRECTORY.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Brand",
                name: b.name,
                url: `${SITE.url}/brands/${slugify(b.name)}`
              }
            }))
          }
        }}
      />

      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <ShieldCheck size={14} /> Neutral directory
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Every footwear brand in India, in one place
        </h1>
        <p className="mt-3 text-slate-600">
          {BRAND_DIRECTORY.length} brands — ₹199 slippers to premium leather boots,
          for men, women and kids. Tell us what you need and we&apos;ll point you at
          the brands that actually make it, with what real buyers said about their
          fit. Then you buy from the brand&apos;s own store, not from us.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          We don&apos;t sell footwear and we take nothing for a placement here. The
          ordering is alphabetical, and the ratings come from shoppers.
        </p>
      </div>

      {/* ---- filters ---- */}
      <div className="mt-8 space-y-3">
        <FilterRow label="What are you looking for?">
          <Chip href={qs({ category: undefined })} active={!category}>All types</Chip>
          {ALL_CATEGORIES.map((c) => (
            <Chip key={c} href={qs({ category: c })} active={category === c}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="For whom">
          <Chip href={qs({ audience: undefined })} active={!audience}>Anyone</Chip>
          {AUDIENCES.map((a) => (
            <Chip key={a} href={qs({ audience: a })} active={audience === a}>
              {a[0].toUpperCase() + a.slice(1)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Budget">
          <Chip href={qs({ price: undefined })} active={!priceBand}>Any</Chip>
          {(Object.keys(PRICE_BANDS) as PriceBand[]).map((p) => (
            <Chip key={p} href={qs({ price: p })} active={priceBand === p}>
              {PRICE_BANDS[p]}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Origin">
          <Chip href={qs({ origin: undefined })} active={!origin}>Any</Chip>
          {ORIGINS.map((o) => (
            <Chip key={o} href={qs({ origin: o })} active={origin === o}>
              {o === "Indian" ? "Made in India" : "Global"}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {brands.length} {brands.length === 1 ? "brand" : "brands"}
        {anyFilter && (
          <>
            {" "}match ·{" "}
            <Link href="/brands" className="font-semibold text-brand-600 hover:underline">
              clear filters
            </Link>
          </>
        )}
      </p>

      {brands.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
          No brand in the directory matches that combination. Try widening the
          budget or the category.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => {
            const s = stats.get(b.name);
            return (
              <div
                key={b.name}
                className="card flex flex-col p-5 transition hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/brands/${slugify(b.name)}`}
                    className="text-lg font-extrabold text-slate-900 hover:text-brand-600"
                  >
                    {b.name}
                  </Link>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      b.origin === "Indian"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {b.origin === "Indian" ? <MapPin size={10} /> : <Globe size={10} />}
                    {b.origin}
                  </span>
                </div>

                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {b.knownFor}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.categories.slice(0, 4).map((c) => (
                    <span key={c} className="chip">{CATEGORY_LABEL[c]}</span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>from ₹{b.fromPrice.toLocaleString("en-IN")}</span>
                  <span>{b.audiences.join(" · ")}</span>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  {s ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={s.rating} size={14} />
                      <span className="text-xs text-slate-500">
                        {s.count} {s.count === 1 ? "review" : "reviews"}
                        {s.sizing && ` · runs ${s.sizing.replace(/-/g, " ")}`}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No shopper reviews yet —{" "}
                      <Link href={`/brands/${slugify(b.name)}`} className="font-semibold text-brand-600 hover:underline">
                        be the first
                      </Link>
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Link href={`/brands/${slugify(b.name)}`} className="btn-ghost flex-1 justify-center text-xs">
                    Reviews &amp; sizing
                  </Link>
                  <a
                    href={`/api/brand-visit?b=${slugify(b.name)}&from=directory`}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="btn-primary flex-1 justify-center text-xs"
                  >
                    Visit store <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 rounded-2xl bg-slate-50 p-5 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-700">How this directory works.</strong> Every
        link goes to the brand&apos;s own website — we don&apos;t take payment for a listing
        or for position, and the list is alphabetical within your filters. Starting
        prices are broad indications, not quotes. Where a brand has no India-specific
        storefront we could verify, we say so and link to their global site. Ratings
        and sizing verdicts come only from Upanah.AI shoppers.
      </p>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:w-32">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  href, active, children
}: {
  href: string; active: boolean; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}
