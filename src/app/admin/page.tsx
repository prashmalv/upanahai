import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getOverview,
  getGeography,
  getDemand,
  getTrend,
  getBrandSentiment,
  getProductInterest,
  getHiddenProducts,
  type Window
} from "@/lib/analytics";
import { StatTile, BarList, Sparkline } from "@/components/admin/Charts";
import { LogoutButton } from "@/components/LogoutButton";
import { ShieldCheck, Users, Search, MessageSquare, TrendingUp, ImageOff } from "lucide-react";

export const dynamic = "force-dynamic";

const WINDOWS: Window[] = [7, 30, 90, 365];

export default async function AdminPage({
  searchParams
}: {
  searchParams: { days?: string };
}) {
  const session = await getSession();

  // Guard here rather than in middleware so the check runs against the real
  // session on every request, with no edge-cached decision to go stale.
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/account");

  const days = (WINDOWS.includes(Number(searchParams.days) as Window)
    ? Number(searchParams.days)
    : 30) as Window;

  const [overview, geo, demand, trend, brands, interest, catalog] = await Promise.all([
    getOverview(days),
    getGeography(days),
    getDemand(days),
    getTrend(days),
    getBrandSentiment(),
    getProductInterest(days),
    getHiddenProducts()
  ]);

  const engagementRate =
    overview.uniqueVisitors > 0
      ? Math.round((overview.totalSearches / overview.uniqueVisitors) * 100) / 100
      : 0;

  return (
    <div className="container-app py-10">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            <ShieldCheck size={14} /> Admin
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            Upanah.AI analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {session.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/account" className="btn-ghost">My account</Link>
          <LogoutButton />
        </div>
      </div>

      {/* window switcher */}
      <div className="mt-6 inline-flex rounded-xl bg-slate-100 p-1">
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/admin?days=${w}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              days === w ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {w === 365 ? "1 year" : `${w} days`}
          </Link>
        ))}
      </div>

      {/* reach */}
      <h2 className="mt-10 flex items-center gap-2 text-lg font-black text-slate-900">
        <Users size={18} className="text-indigo-600" /> Reach &amp; usage
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Unique visitors"
          value={overview.uniqueVisitors}
          sub={`last ${days} days · people, not requests`}
          accent
        />
        <StatTile label="Page views" value={overview.pageViews} sub={`last ${days} days`} />
        <StatTile
          label="Registered users"
          value={overview.totalUsers}
          sub={`+${overview.newUsers} in last ${days} days`}
        />
        <StatTile
          label="Searches per visitor"
          value={engagementRate}
          sub="engagement depth"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Searches" value={overview.totalSearches} />
        <StatTile label="Foot scans" value={overview.footScans} />
        <StatTile label="Photo matches" value={overview.photoMatches} />
        <StatTile label="Virtual try-ons" value={overview.tryOns} />
        <StatTile
          label="Buy clicks"
          value={overview.buyClicks}
          sub="sent to retailers"
        />
      </div>

      <div className="mt-6">
        <Sparkline title={`Daily activity — last ${days} days`} series={trend} />
      </div>

      {/* demand */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <Search size={18} className="text-indigo-600" /> What people are looking for
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {demand.totalSearches.toLocaleString("en-IN")} searches analysed. This is the
        demand signal a brand would pay for.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <BarList
          title="Men / Women / Kids"
          subtitle="Which audience is in demand"
          rows={demand.byGender}
          format={cap}
        />
        <BarList
          title="Shoe type"
          subtitle="Most searched categories"
          rows={demand.byCategory}
          format={cap}
        />
        <BarList
          title="Brands searched by name"
          subtitle="Shoppers who already know what they want"
          rows={demand.byBrand}
          empty="No brand-specific searches yet"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <BarList
          title="Need / feature asked for"
          subtitle="Arch support, cushioning, grip …"
          rows={demand.byNeed}
          format={(k) => cap(k.replace(/-/g, " "))}
        />
        <BarList
          title="Budget bands"
          subtitle="Where price expectations sit"
          rows={demand.budgetBands}
          empty="No budgets mentioned in searches yet"
        />
        <BarList
          title="Persona"
          subtitle="Seniors, sports, parents"
          rows={demand.byPersona}
          format={cap}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList
          title="Top search phrases"
          subtitle="Exact wording, most frequent first"
          rows={demand.topQueries}
        />
        <BarList
          title="⚠ Searches that returned nothing"
          subtitle="Clearest catalog gap — demand you cannot serve today"
          rows={demand.zeroResultQueries}
          empty="Every search returned results"
        />
      </div>

      {/* geography */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <TrendingUp size={18} className="text-indigo-600" /> Where users register from
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Collected at signup (self-declared), not guessed from IP.
        {geo.unknownState > 0 && (
          <> {geo.unknownState} of {geo.total} users didn&apos;t pick a state.</>
        )}
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <BarList
          title="By state — all time"
          rows={geo.byStateAllTime}
          empty="No states recorded yet"
        />
        <BarList
          title={`By state — last ${days} days`}
          rows={geo.byStateWindow}
          empty="No new registrations in this window"
        />
        <BarList
          title="Top cities"
          rows={geo.byCityAllTime}
          empty="No cities recorded yet"
        />
      </div>

      {/* commerce interest */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <TrendingUp size={18} className="text-indigo-600" /> Purchase intent
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList
          title="Most clicked-to-buy products"
          subtitle={`Buy clicks in the last ${days} days`}
          rows={interest.topProducts.map((p) => ({ key: p.label, count: p.clicks }))}
          empty="No buy clicks yet"
        />
        <BarList
          title="Which retailer wins the click"
          rows={interest.byRetailer}
          empty="No retailer clicks yet"
        />
      </div>

      {/* community + brand feedback */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <MessageSquare size={18} className="text-indigo-600" /> Community &amp; feedback
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Questions asked" value={overview.questions} sub={`last ${days} days`} />
        <StatTile label="Answers posted" value={overview.answers} sub={`last ${days} days`} />
        <StatTile label="Brand reviews" value={overview.brandReviews} sub={`last ${days} days`} />
        <StatTile label="Product reviews" value={overview.productReviews} sub={`last ${days} days`} />
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-bold text-slate-900">Brand scorecard</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Neutral, from Upanah.AI reviewers — not retailer ratings. This is the
            dataset a brand can act on.
          </p>
        </div>
        {brands.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">
            No brand reviews yet. They appear here as shoppers rate brands.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">Brand</th>
                  <th className="p-3">Reviews</th>
                  <th className="p-3">Overall</th>
                  <th className="p-3">Quality</th>
                  <th className="p-3">Comfort</th>
                  <th className="p-3">Durability</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Sizing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map((b) => (
                  <tr key={b.brand}>
                    <td className="p-3 font-semibold text-slate-900">{b.brand}</td>
                    <td className="p-3 tabular-nums text-slate-500">{b.reviews}</td>
                    <td className="p-3 font-bold tabular-nums text-slate-900">{b.rating || "—"}</td>
                    <td className="p-3 tabular-nums text-slate-600">{b.quality || "—"}</td>
                    <td className="p-3 tabular-nums text-slate-600">{b.comfort || "—"}</td>
                    <td className="p-3 tabular-nums text-slate-600">{b.durability || "—"}</td>
                    <td className="p-3 tabular-nums text-slate-600">{b.value || "—"}</td>
                    <td className="p-3 text-slate-600">{b.sizingVerdict.replace(/-/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* catalog health */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <ImageOff size={18} className="text-indigo-600" /> Catalog health
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {catalog.visible} of {catalog.total} products are publishable. A product is
        withheld from every listing when its image can&apos;t be shown, or can&apos;t be
        published under the brand it&apos;s listed against — showing a rival&apos;s shoe on a
        brand&apos;s listing is the kind of thing that brand notices first.
      </p>

      {catalog.hidden.length === 0 ? (
        <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Every product has a publishable image.
        </p>
      ) : (
        <div className="mt-4 card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Why it&apos;s withheld</th>
                <th className="p-3">Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {catalog.hidden.map((h) => (
                <tr key={h.slug}>
                  <td className="p-3 font-semibold text-slate-900">
                    {h.brand} {h.name}
                  </td>
                  <td className="p-3 text-slate-600">{h.imageNote || "—"}</td>
                  <td className="p-3 whitespace-nowrap text-xs text-slate-400">
                    {h.imageCheckedAt
                      ? h.imageCheckedAt.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-500">
            <strong className="text-slate-700">To bring these back:</strong> supply a
            first-party product image (from the brand or the retailer feed), update{" "}
            <code className="rounded bg-slate-100 px-1">imageUrl</code>, then run{" "}
            <code className="rounded bg-slate-100 px-1">
              npx tsx prisma/audit-images.ts --hide
            </code>
            . Anything that passes is un-hidden automatically. A photo with no visible
            brand mark is fine; a competitor&apos;s logo is not.
          </p>
        </div>
      )}

      <p className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-700">How these numbers are produced:</strong> unique
        visitors count distinct browsers (a first-party cookie), so one person
        browsing 20 pages counts once. Searches are logged only when a shopper
        actually searches or filters — not when they merely open the search page.
        Registration geography is what users chose at signup; visitors who never
        register aren&apos;t geolocated. Your own visits to /admin are excluded.
      </p>
    </div>
  );
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
