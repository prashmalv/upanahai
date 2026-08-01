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
  getBrandLeads,
  getHealthOutcomes,
  getUsers,
  getResetRequests,
  type Window
} from "@/lib/analytics";
import { StatTile, BarList, Sparkline } from "@/components/admin/Charts";
import { LogoutButton } from "@/components/LogoutButton";
import { MIN_EPISODES_FOR_RATE } from "@/lib/outcomes";
import { surveyResults, surveyRespondents, MIN_ANSWERS } from "@/lib/buyerSurvey";
import { ResetRequests } from "@/components/admin/ResetRequests";
import {
  ShieldCheck, Users, Search, MessageSquare, TrendingUp, ImageOff, ArrowUpRight, HeartPulse, KeyRound
} from "lucide-react";

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

  const [overview, geo, demand, trend, brands, interest, catalog, leads, outcomes,
         survey, surveyPeople, users, resetRequests] = await Promise.all([
    getOverview(days),
    getGeography(days),
    getDemand(days),
    getTrend(days),
    getBrandSentiment(),
    getProductInterest(days),
    getHiddenProducts(),
    getBrandLeads(days),
    // Not windowed: an outcome loop that only counted the last 30 days would
    // discard every follow-up the moment it became answerable.
    getHealthOutcomes(),
    surveyResults(),
    surveyRespondents(),
    getUsers(),
    getResetRequests()
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

      {/* leads delivered to brands */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <ArrowUpRight size={18} className="text-indigo-600" /> Leads sent to brands
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {leads.total.toLocaleString("en-IN")} click-throughs to brand stores in the
        last {days} days. This is what a brand gets from being listed — traffic from
        someone who already knows their size and has read other buyers&apos; verdicts.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList
          title="Leads by brand"
          subtitle="Click-throughs to the brand's own store"
          rows={leads.leads.map((l) => ({ key: l.brand, count: l.clicks }))}
          empty="No brand click-throughs yet"
        />
        <BarList
          title="Reach per brand"
          subtitle="Distinct people, not repeat clicks"
          rows={leads.leads.map((l) => ({ key: l.brand, count: l.people }))}
          empty="No brand click-throughs yet"
        />
      </div>

      {/* locked-out people, and everyone who has registered */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <KeyRound size={18} className="text-indigo-600" /> Password reset requests
        {resetRequests.length > 0 && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
            {resetRequests.length}
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        There is no email-based reset yet, so requests land here and you reset by
        hand. That works while the numbers are small — once this list needs
        attention daily, it needs to become a link sent by email instead.
      </p>
      <ResetRequests
        requests={resetRequests.map((r) => ({ ...r, at: r.at.toISOString() }))}
      />

      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <Users size={18} className="text-indigo-600" /> Registered users
        <span className="text-sm font-semibold text-slate-400">{users.length}</span>
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Everyone who has an account. Measurements, health logs and survey answers
        are deliberately not shown here — running the platform does not need them,
        and a dashboard that displays them becomes a problem the first time this
        screen is left open.
      </p>
      <div className="mt-4 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Who</th>
              <th className="p-3">Role</th>
              <th className="p-3">Where</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Last seen</th>
              <th className="p-3 text-right">Contributions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <span className="font-semibold text-slate-900">{u.name || "—"}</span>
                  <span className="block text-xs text-slate-500">{u.email}</span>
                  {u.mustChangePassword && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      must change password
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      u.role === "admin"
                        ? "bg-indigo-100 text-indigo-700"
                        : u.role === "brand"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.brandName && (
                    <span className="block text-xs text-slate-500">{u.brandName}</span>
                  )}
                </td>
                <td className="p-3 text-slate-600">{u.where || "—"}</td>
                <td className="p-3 whitespace-nowrap text-xs text-slate-500">
                  {u.joined.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="p-3 whitespace-nowrap text-xs text-slate-500">
                  {u.lastLogin
                    ? u.lastLogin.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : "never signed in"}
                </td>
                <td className="p-3 text-right font-semibold text-slate-700">
                  {u.contributions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* buyer behaviour — the dataset nobody else has */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <Users size={18} className="text-indigo-600" /> How people buy footwear
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {surveyPeople} {surveyPeople === 1 ? "person has" : "people have"} answered the
        open survey. Sales figures say what sold; this says who the buyer was
        struggling to buy for, what happened to the pair they replaced, and whether
        anyone compared. No question is scored until {MIN_ANSWERS} people have
        answered it.
      </p>

      {surveyPeople === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          No answers yet. The survey is at{" "}
          <Link href="/survey" className="font-semibold text-brand-600 hover:underline">/survey</Link>.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {survey
            .filter((q) => q.total > 0)
            .map((q) => (
              <BarList
                key={q.key}
                title={q.short}
                subtitle={`${q.question} · ${q.total} ${q.total === 1 ? "answer" : "answers"}${
                  q.total < MIN_ANSWERS ? " — too few to read as a percentage" : ""
                }`}
                rows={q.choices
                  .filter((c) => c.count > 0)
                  .map((c) => ({ key: c.label, count: c.count }))}
                empty="Nobody has answered this yet"
              />
            ))}
        </div>
      )}

      {/* health outcomes — the only section that measures whether we helped */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-black text-slate-900">
        <HeartPulse size={18} className="text-indigo-600" /> Health outcomes
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Four weeks after we give someone footwear guidance for logged pain, we ask
        two questions: did you change your footwear, and is the pain better. This is
        the only number here that says whether the product did any good.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Health consents" value={outcomes.consentCount} sub="people who agreed to health logging" />
        <StatTile label="Episodes opened" value={outcomes.opened} sub="guidance given for logged pain" accent />
        <StatTile
          label="Follow-ups answered"
          value={outcomes.answered}
          sub={
            outcomes.responseRatePct === null
              ? "none due yet"
              : `${outcomes.responseRatePct}% of those asked`
          }
        />
        <StatTile
          label="Referred to a clinician"
          value={outcomes.redFlagUsers}
          sub="people who reported a red-flag symptom"
        />
      </div>

      {outcomes.tooEarly ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <strong>Not enough answers to quote a rate yet.</strong> {outcomes.answered} of the{" "}
          {MIN_EPISODES_FOR_RATE} needed. Reporting a percentage off a handful of replies
          would be a number that sounds like evidence and isn&apos;t — the counts below are
          what we actually have.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Acted on the guidance
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-700">
              {outcomes.actedImprovedPct}%
            </p>
            <p className="mt-1 text-sm text-slate-500">
              reported less pain, of {outcomes.acted} who changed their footwear
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Did not change footwear
            </p>
            <p className="mt-1 text-3xl font-black text-slate-700">
              {outcomes.notActedImprovedPct ?? "—"}%
            </p>
            <p className="mt-1 text-sm text-slate-500">
              reported less pain, of {outcomes.notActed} — the comparison that matters
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList
          title="What people reported at four weeks"
          rows={Object.entries(outcomes.byPainChange).map(([key, count]) => ({
            key: cap(key),
            count
          }))}
          empty="No follow-ups answered yet"
        />
        <BarList
          title="Features suggested, by episode"
          rows={outcomes.needCounts.map((n) => ({
            key: cap(n.need.replace(/-/g, " ")),
            count: n.total
          }))}
          empty="No guidance given yet"
        />
      </div>

      <div className="mt-4 card p-5">
        <p className="font-bold text-slate-900">
          Anonymised foot anthropometry ({outcomes.anthropometry.contributors} contributors)
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Only from users who separately opted in to research use. India has almost no
          published foot-shape data, and brands size their lasts against Western
          averages — this is the dataset that gap creates.
        </p>
        {outcomes.anthropometry.byState.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing to show yet. States with fewer than five contributors are withheld,
            because an average over two people is not a statistic and could identify
            them. {outcomes.anthropometry.suppressed > 0 && `${outcomes.anthropometry.suppressed} state(s) currently below that floor.`}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">State</th>
                  <th className="p-3">Contributors</th>
                  <th className="p-3">Mean foot length</th>
                  <th className="p-3">Wide-footed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outcomes.anthropometry.byState.map((s) => (
                  <tr key={s.state}>
                    <td className="p-3 font-semibold text-slate-900">{s.state}</td>
                    <td className="p-3 text-slate-600">{s.n}</td>
                    <td className="p-3 text-slate-600">{s.meanLengthMm} mm</td>
                    <td className="p-3 text-slate-600">{s.widePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-700">What this evidence is worth:</strong>{" "}
        self-reported, unblinded, and with no control group — people who felt better
        are also likelier to answer. It is real enough to steer the product and to
        show that outcomes are being measured at all, and nowhere near enough to
        claim a clinical effect. Anyone quoting it should quote the response rate
        beside it.
      </p>

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
                  <td className="p-3 text-slate-600">{h.reason || "—"}</td>
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
