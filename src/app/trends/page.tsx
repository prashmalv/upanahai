import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE, breadcrumbJsonLd } from "@/lib/seo";
import { getPulse, brandSlug, MIN_VOICES, type PulseRow } from "@/lib/pulse";
import { SizeQuiz } from "@/components/SizeQuiz";
import { BrandPicks } from "@/components/BrandPicks";
import { FACTS } from "@/lib/footFacts";
import {
  TrendingUp, Users, Search, ArrowUpRight, MessageSquare,
  AlertTriangle, Info, Lightbulb, ArrowRight
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What India is searching for in footwear — live demand from Upanah.AI",
  description:
    "Which shoe types, brands, budgets and needs shoppers in India are actually searching for, counted from real searches on Upanah.AI. Not a sales chart — nobody publishes footwear sales for India — but our own demand data, with the count of people behind every row.",
  keywords: [
    "footwear trends India",
    "most searched shoe brands India",
    "shoe demand India",
    "popular footwear categories India",
    "trending shoes India"
  ],
  alternates: { canonical: "/trends" }
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pretty = (s: string) => cap(s.replace(/-/g, " "));

export default async function TrendsPage() {
  const pulse = await getPulse();

  return (
    <div className="container-app py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "What India is searching for", path: "/trends" }
        ])}
      />

      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <TrendingUp size={14} /> Demand board
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          What India is actually asking for
        </h1>
        <p className="mt-3 text-slate-600">
          Not a bestseller list. Nobody publishes footwear sales figures for India,
          so anyone showing you one is guessing. This is our own demand data — what
          people searched for here in the last {pulse.days} days — and every row
          shows how many <em>people</em> are behind it, not how many clicks.
        </p>
      </div>

      {pulse.thin ? (
        <ThinBoard people={pulse.people} searches={pulse.searches} />
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Tile icon={Users} label="People searching" value={pulse.people} />
            <Tile icon={Search} label="Searches" value={pulse.searches} />
            <Tile
              icon={MessageSquare}
              label="Questions asked"
              value={pulse.questions.length}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Board
              title="Most wanted shoe types"
              subtitle="By number of people searching"
              rows={pulse.categories}
              format={cap}
              href={(k) => `/search?category=${encodeURIComponent(k)}`}
            />
            <Board
              title="Brands people search by name"
              subtitle="Shoppers who already know what they want"
              rows={pulse.brands}
              format={cap}
              href={(k) => `/brands/${brandSlug(k)}`}
            />
            <Board
              title="What they need it to do"
              subtitle="Arch support, cushioning, grip…"
              rows={pulse.needs}
              format={pretty}
              href={(k) => `/search?q=${encodeURIComponent(k.replace(/-/g, " "))}`}
            />
            <Board
              title="Men, women or kids"
              rows={pulse.audiences}
              format={cap}
              href={(k) => `/search?gender=${encodeURIComponent(k)}`}
            />
            <Board title="What people expect to spend" rows={pulse.budgets} />
            <Board
              title="Brands people clicked through to"
              subtitle="Real intent — they went to the store"
              rows={pulse.visited}
              href={(k) => `/brands/${brandSlug(k)}`}
              icon={ArrowUpRight}
            />
          </div>

          {pulse.queries.length > 0 && (
            <div className="mt-6">
              <Board
                title="The exact things people typed"
                subtitle={`Only phrases ${MIN_VOICES}+ different people searched for`}
                rows={pulse.queries}
                href={(k) => `/search?q=${encodeURIComponent(k)}`}
              />
            </div>
          )}

          {pulse.unserved.length > 0 && (
            <div className="mt-6 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
              <p className="flex items-center gap-2 font-black text-amber-900">
                <AlertTriangle size={17} /> What we couldn&apos;t answer
              </p>
              <p className="mt-1 text-sm text-amber-900">
                Searches here that returned nothing. We publish this because a gap
                you can see is more useful than a catalog pretending to be complete
                — and because it tells us what to fix next.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {pulse.unserved.map((r) => (
                  <li
                    key={r.key}
                    className="rounded-full bg-white px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200"
                  >
                    {r.key} · {r.people}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pulse.questions.length > 0 && (
            <div className="mt-6 card p-5">
              <p className="flex items-center gap-2 font-black text-slate-900">
                <MessageSquare size={17} className="text-indigo-600" /> What people are
                asking each other
              </p>
              <ul className="mt-3 divide-y divide-slate-100">
                {pulse.questions.map((q) => (
                  <li key={q.slug} className="py-2.5">
                    <Link
                      href={`/community/${q.slug}`}
                      className="text-sm font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {q.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-400">
                      {q.answers} {q.answers === 1 ? "answer" : "answers"}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/community" className="btn-ghost mt-4">
                Ask your own <ArrowRight size={14} />
              </Link>
            </div>
          )}

          <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            <strong className="text-slate-700">How to read this.</strong> Counts are
            distinct people over the last {pulse.days} days, so one person searching
            the same thing ten times counts once. A row appears only once{" "}
            {MIN_VOICES} different people are behind it — below that it is noise, and
            publishing it would let a handful of visitors look like a national trend.
            None of this is sales data, and it is demand on this site rather than
            demand in India as a whole.
          </p>
        </>
      )}

      {/* Brand-authored best sellers. Works on day one because it is quoted rather
          than computed, and it is the closest thing to "what's popular" that we can
          state without inventing a figure. */}
      <BrandPicks />

      {/* The quiz runs whether or not the board has data — it is the part that
          works on day one, and it argues for measuring rather than guessing. */}
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Lightbulb size={20} className="text-indigo-600" /> How well do you know
            shoe sizes?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Eight questions. Every answer is arithmetic or a published convention,
            with its source shown — and most people get half of them wrong, which is
            a large part of why shoes don&apos;t fit.
          </p>
          <div className="mt-4">
            <SizeQuiz />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900">Things worth knowing</h2>
          <div className="mt-4 space-y-3">
            {FACTS.map((f) => (
              <div key={f.title} className="card p-5">
                <p className="font-black text-slate-900">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
                <p className="mt-2 text-xs text-slate-400">{f.source}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinBoard({ people, searches }: { people: number; searches: number }) {
  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
      <p className="flex items-center gap-2 font-black text-slate-900">
        <Info size={18} className="text-indigo-600" /> Not enough people yet to call
        anything a trend
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        {searches === 0
          ? "No searches have been logged in this window yet."
          : `${searches} ${searches === 1 ? "search" : "searches"} from ${people} ${
              people === 1 ? "person" : "people"
            } so far.`}{" "}
        A row goes up here only once {MIN_VOICES} different people are behind it. We
        could fill this page today by counting clicks instead of people, or by
        borrowing a &quot;top 10 shoes in India&quot; list from somewhere and not
        saying where it came from. Both would make the page look established and
        neither would be true, so the board stays empty until it isn&apos;t.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
        You can make it fill up faster: search for what you actually need, and
        review a brand you have bought from. Both feed this page, and the reviews
        are what make our brand advice worth reading.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/search" className="btn-primary">
          Search for what you need <ArrowRight size={15} />
        </Link>
        <Link href="/brands" className="btn-ghost">
          Rate a brand you have used
        </Link>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={13} /> {label}
      </p>
      <p className="mt-1 text-3xl font-black text-slate-900">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function Board({
  title,
  subtitle,
  rows,
  format = (s: string) => s,
  href,
  icon: Icon
}: {
  title: string;
  subtitle?: string;
  rows: PulseRow[];
  format?: (s: string) => string;
  href?: (key: string) => string;
  icon?: typeof ArrowUpRight;
}) {
  if (rows.length === 0) return null;
  const top = rows[0].people || 1;

  return (
    <div className="card p-5">
      <p className="font-black text-slate-900">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <ul className="mt-4 space-y-2.5">
        {rows.slice(0, 8).map((r, i) => {
          const label = format(r.key);
          const bar = Math.max(6, Math.round((r.people / top) * 100));
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="w-4 shrink-0 text-xs font-bold text-slate-300">
                    {i + 1}
                  </span>
                  {href ? (
                    <Link
                      href={href(r.key)}
                      className="truncate font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="truncate font-semibold text-slate-800">{label}</span>
                  )}
                  {Icon && <Icon size={12} className="shrink-0 text-slate-300" />}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {r.people} {r.people === 1 ? "person" : "people"}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-400"
                  style={{ width: `${bar}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
