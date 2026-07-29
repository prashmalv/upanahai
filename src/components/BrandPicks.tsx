import Link from "next/link";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/brandDirectory";
import { ArrowUpRight, Quote } from "lucide-react";

/**
 * A brand's own best-seller list, quoted.
 *
 * The attribution is the feature, not the small print. "Campus lists these under
 * its own Best Sellers collection, read on 29 July" is a checkable statement; "top
 * selling shoes in India" would be one we made up. So the collection name and the
 * date are rendered next to the list, not tucked into a footer, and there are no
 * product images — those belong to the brand.
 */
export async function BrandPicks({
  brand,
  limit = 8,
  heading
}: {
  brand?: string;
  limit?: number;
  heading?: string;
}) {
  const picks = await prisma.brandPick.findMany({
    where: brand ? { brand } : {},
    orderBy: [{ brand: "asc" }, { position: "asc" }]
  });
  if (picks.length === 0) return null;

  const groups = new Map<string, typeof picks>();
  for (const p of picks) {
    if (!groups.has(p.brand)) groups.set(p.brand, []);
    const g = groups.get(p.brand)!;
    if (g.length < limit) g.push(p);
  }

  const date = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className={brand ? "mt-12" : "container-app py-16"}>
      <h2 className="text-xl font-black text-slate-900 md:text-2xl">
        {heading ?? "What the brands themselves call their best sellers"}
      </h2>
      {!brand && (
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Read straight off each brand&apos;s own store. These are their claims about
          their own products, not ours about the market — nobody publishes footwear
          sales figures for India, so anyone showing you a national bestseller chart
          is guessing.
        </p>
      )}

      <div className={`mt-5 grid gap-4 ${brand ? "" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {Array.from(groups.entries()).map(([name, rows]) => (
          <div key={name} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">{name}</p>
                <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                  <Quote size={11} className="mt-0.5 shrink-0" />
                  <span>
                    Their own &ldquo;{rows[0].collectionName}&rdquo; collection, read{" "}
                    {date(rows[0].fetchedAt)}
                  </span>
                </p>
              </div>
              {!brand && (
                <Link
                  href={`/brands/${slugify(name)}`}
                  className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                >
                  Reviews
                </Link>
              )}
            </div>

            <ol className="mt-4 space-y-2.5">
              {rows.map((p, i) => (
                <li key={p.id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-4 shrink-0 text-xs font-bold text-slate-300">
                    {i + 1}
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="min-w-0 flex-1 truncate font-medium text-slate-800 hover:text-brand-600"
                    title={p.title}
                  >
                    {p.title}
                  </a>
                  {p.priceInr > 0 && (
                    <span className="shrink-0 text-xs text-slate-500">
                      ₹{p.priceInr.toLocaleString("en-IN")}
                    </span>
                  )}
                  <ArrowUpRight size={11} className="shrink-0 text-slate-300" />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Prices are what the brand listed when we read the page and will have moved
        since — the link goes to their store, which is the only place a current price
        exists. We show no product photographs here because those are the
        brand&apos;s to publish, not ours.
      </p>
    </section>
  );
}
