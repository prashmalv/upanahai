import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession, readVisitorId } from "@/lib/auth";
import { logSearch } from "@/lib/track";
import { parseSearchIntent, explainRecommendation, aiEnabled } from "@/lib/ai";
import { deriveIntent, scoreProducts } from "@/lib/recommender";
import { toCard, DISPLAYABLE } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { Sparkles, SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Footwear Search — Compare Branded Shoe Prices in India",
  description:
    "Describe what you need in plain language or by voice and get ranked footwear recommendations, with price, rating and delivery compared across Amazon, Flipkart, Myntra, Ajio and official brand stores.",
  keywords: [
    "compare shoe prices India",
    "best shoes under 5000",
    "running shoes price comparison",
    "branded footwear online India",
    "AI shoe search"
  ],
  alternates: { canonical: "/search" }
};

type SP = { q?: string; category?: string; gender?: string; persona?: string };

/**
 * Which brand (if any) the shopper named. Recorded so the admin can answer
 * "is this brand being searched for?" — the question a brand actually pays for.
 */
function matchedBrand(query: string, products: { brand: string }[]): string {
  if (!query) return "";
  const q = query.toLowerCase();
  const brands = Array.from(new Set(products.map((p) => p.brand)));
  return brands.find((b) => q.includes(b.toLowerCase())) || "";
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = searchParams.q?.trim() || "";

  // Build intent: AI first (if configured + free-text query), else heuristic.
  let intent = q ? (await parseSearchIntent(q)) ?? deriveIntent(q) : deriveIntent("");
  // Merge explicit filters from query string
  if (searchParams.category) intent.categories = [searchParams.category];
  if (searchParams.gender) intent.gender = searchParams.gender as any;
  if (searchParams.persona) intent.persona = searchParams.persona as any;

  // Only displayable products enter the ranking pool.
  const all = await prisma.product.findMany({ where: DISPLAYABLE, include: { offers: true } });
  const ranked = scoreProducts(all, intent)
    .filter((r) => r.score > -10)
    .slice(0, 24);

  const cards = ranked.map((r) => ({ card: toCard(r.product, r.reasons), score: r.score }));

  // wishlist state
  const session = await getSession();

  // Demand signal for the admin reports. Only real searches are logged — an
  // empty browse of /search would just add noise to the "what people want" data.
  if (q || searchParams.category || searchParams.gender || searchParams.persona) {
    await logSearch({
      query: q,
      source: q ? "text" : searchParams.category ? "category" : "persona",
      userId: session?.userId ?? null,
      visitorId: readVisitorId(),
      gender: intent.gender || searchParams.gender || "",
      category: intent.categories?.[0] || searchParams.category || "",
      brand: matchedBrand(q, all),
      persona: intent.persona || searchParams.persona || "",
      maxPrice: intent.maxPrice ?? null,
      needs: intent.needs || [],
      aiParsed: aiEnabled && !!q,
      resultCount: cards.length
    });
  }
  let wished = new Set<string>();
  if (session) {
    const w = await prisma.wishlist.findMany({ where: { userId: session.userId } });
    wished = new Set(w.map((x) => x.productId));
  }

  // AI natural-language summary (optional)
  let summary: string | null = null;
  if (q && aiEnabled && ranked.length) {
    summary = await explainRecommendation(
      q,
      ranked.slice(0, 3).map((r) => `${r.product.brand} ${r.product.name} (${r.product.category}, ₹${r.lowestPrice})`)
    );
  }

  const heading = q
    ? `Results for “${q}”`
    : searchParams.category
    ? `${cap(searchParams.category)} footwear`
    : searchParams.gender
    ? `${cap(searchParams.gender)}'s footwear`
    : searchParams.persona
    ? `Best for ${searchParams.persona}`
    : "All footwear";

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-3xl">
        <SearchBar defaultValue={q} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{heading}</h1>
          <p className="text-sm text-slate-500">{cards.length} matches · sorted by best fit for your need</p>
        </div>
        <span className="chip"><SlidersHorizontal size={13} /> {aiEnabled ? "AI ranked" : "Smart ranked"}</span>
      </div>

      {summary && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
          <Sparkles className="mt-0.5 shrink-0 text-brand-600" size={18} />
          <p className="text-sm text-brand-900">{summary}</p>
        </div>
      )}

      {/* active need chips */}
      {(intent.needs?.length || intent.categories?.length) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {intent.categories?.map((c) => <span key={c} className="chip">{c}</span>)}
          {intent.needs?.map((n) => <span key={n} className="chip">{n.replace("-", " ")}</span>)}
          {intent.maxPrice ? <span className="chip">under ₹{intent.maxPrice}</span> : null}
        </div>
      ) : null}

      {cards.length === 0 ? (
        <div className="mt-16 text-center text-slate-500">
          <p>No matches found. Try a broader search.</p>
          <Link href="/search" className="btn-ghost mt-4">Browse all</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map(({ card }) => (
            <ProductCard key={card.id} p={card} inWishlist={wished.has(card.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
