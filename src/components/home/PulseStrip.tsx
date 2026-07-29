import Link from "next/link";
import { getPulse, brandSlug, MIN_VOICES } from "@/lib/pulse";
import { SizeQuiz } from "@/components/SizeQuiz";
import { TrendingUp, ArrowRight, Lightbulb } from "lucide-react";

/**
 * Home-page strip for the demand board.
 *
 * When there is real demand data it shows the top rows and sends people to the
 * full board. When there isn't — which is the honest state of a new site — it
 * shows the sizing quiz instead of an empty chart. The alternative would be to
 * dress up three searches as a national trend, and a shopper who later finds out
 * has no reason to believe the brand advice either.
 */
export async function PulseStrip() {
  const pulse = await getPulse();

  if (pulse.thin) {
    return (
      <section className="container-app py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              <Lightbulb size={14} /> Before you buy
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Most people get shoe sizing wrong. Try eight questions.
            </h2>
            <p className="mt-3 max-w-lg text-slate-600">
              One UK size is 8.5 millimetres. A children&apos;s 13 is nowhere near an
              adult 13. Bata isn&apos;t Indian. Every answer here is arithmetic or a
              published convention, shown with its source — and by the end it&apos;s
              obvious why guessing your size is a coin toss.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/foot-scan" className="btn-primary">
                Skip ahead — measure my feet <ArrowRight size={15} />
              </Link>
              <Link href="/trends" className="btn-ghost">
                What India is searching for
              </Link>
            </div>
          </div>
          <SizeQuiz compact />
        </div>
      </section>
    );
  }

  const cols: { title: string; rows: typeof pulse.categories; href: (k: string) => string }[] = [
    {
      title: "Most wanted shoe types",
      rows: pulse.categories.slice(0, 5),
      href: (k) => `/search?category=${encodeURIComponent(k)}`
    },
    {
      title: "Brands searched by name",
      rows: pulse.brands.slice(0, 5),
      href: (k) => `/brands/${brandSlug(k)}`
    },
    {
      title: "What people need it to do",
      rows: pulse.needs.slice(0, 5),
      href: (k) => `/search?q=${encodeURIComponent(k.replace(/-/g, " "))}`
    }
  ];

  return (
    <section className="container-app py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            <TrendingUp size={14} /> Demand board · last {pulse.days} days
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            What India is actually asking for
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Counted in people, not clicks, from{" "}
            {pulse.searches.toLocaleString("en-IN")} real searches here. Not a sales
            chart — nobody publishes footwear sales for India.
          </p>
        </div>
        <Link href="/trends" className="btn-ghost">
          See the full board <ArrowRight size={15} />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cols
          .filter((c) => c.rows.length > 0)
          .map((c) => (
            <div key={c.title} className="card p-5">
              <p className="font-black text-slate-900">{c.title}</p>
              <ol className="mt-3 space-y-2">
                {c.rows.map((r, i) => (
                  <li key={r.key} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={c.href(r.key)}
                      className="flex min-w-0 items-baseline gap-2 text-sm font-semibold text-slate-800 hover:text-brand-600"
                    >
                      <span className="text-xs font-bold text-slate-300">{i + 1}</span>
                      <span className="truncate capitalize">{r.key.replace(/-/g, " ")}</span>
                    </Link>
                    <span className="shrink-0 text-xs text-slate-400">{r.people}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        A row appears only once {MIN_VOICES} different people are behind it.
      </p>
    </section>
  );
}
