import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { BuyerSurvey } from "@/components/BuyerSurvey";
import { surveyResults, surveyRespondents, MIN_ANSWERS } from "@/lib/buyerSurvey";
import { Users, BarChart3, Info, ArrowRight, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How India buys footwear — an open survey",
  description:
    "What happens to the pair you stop wearing? Does anyone compare before buying? Who is hardest to buy shoes for? Ten anonymous questions, and the running results in the open. Nobody publishes this for India, so we are asking.",
  keywords: [
    "footwear buying behaviour India",
    "how Indians buy shoes",
    "shoe shopping survey India",
    "footwear consumer research India"
  ],
  alternates: { canonical: "/survey" }
};

export default async function SurveyPage() {
  const [results, respondents] = await Promise.all([
    surveyResults(),
    surveyRespondents()
  ]);
  const withEnough = results.filter((r) => r.total >= MIN_ANSWERS);

  return (
    <div className="container-app py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "How India buys footwear", path: "/survey" }
        ])}
      />

      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <Users size={14} /> Open survey
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          How does India actually buy footwear?
        </h1>
        <p className="mt-3 text-slate-600">
          What happens to the pair you stop wearing. Whether anyone compares before
          buying. Who in the family is hardest to buy for. These are ordinary
          questions with no published answers for India — so we are asking, and
          putting the results in the open rather than in a deck.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Ten questions, no sign-in, nothing personal asked. Every question can be
          skipped, and you can change an answer later.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <BuyerSurvey />

        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <BarChart3 size={19} className="text-indigo-600" /> What people have said
            so far
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {respondents === 0
              ? "Nobody has answered yet. Be the first."
              : `${respondents} ${respondents === 1 ? "person" : "people"} so far.`}{" "}
            A question shows percentages only once {MIN_ANSWERS} people have answered
            it — below that the raw count is all it can honestly say.
          </p>

          {withEnough.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
              Nothing worth publishing yet. We could fill this page with round numbers
              nobody could check — every consumer-insight page you have ever seen does
              — but a statistic invented to look established is the one thing that
              would make the rest of this site not worth believing.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {withEnough.map((r) => {
                const top = [...r.choices].sort((a, b) => b.count - a.count)[0];
                return (
                  <div key={r.key} className="card p-5">
                    <p className="font-bold text-slate-900">{r.question}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {r.total} {r.total === 1 ? "answer" : "answers"}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {r.choices
                        .filter((c) => c.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((c) => (
                          <li key={c.key}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="text-slate-700">{c.label}</span>
                              <span className="shrink-0 font-semibold text-slate-500">
                                {c.pct}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  c.key === top.key ? "bg-indigo-500" : "bg-slate-300"
                                }`}
                                style={{ width: `${c.pct}%` }}
                              />
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-4xl rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Info size={18} className="text-indigo-600" /> What we do with the answers
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <li>
            · They are <strong>anonymous</strong>. One tap per question, tied to a
            browser cookie so one person counts once — not to a name, an email or a
            location.
          </li>
          <li>
            · The aggregate is <strong>public, on this page</strong>, as it comes in.
            You can see what we see.
          </li>
          <li>
            · They shape what gets built. A question about repairing old shoes is
            there because the answer decides whether repair is worth building for.
          </li>
          <li>
            · No percentage is published until {MIN_ANSWERS} people have answered
            that question, for the same reason the demand board withholds a row until
            five people are behind it.
          </li>
        </ul>
      </div>

      <div className="mx-auto mt-6 max-w-4xl rounded-2xl bg-slate-900 p-6 md:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
          <Building2 size={14} /> For brands
        </p>
        <p className="mt-2 text-lg font-black text-white">
          This is the part of the market nobody measures
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Sales figures tell a brand what sold. They do not say who the buyer was
          struggling to buy for, how many pairs they compared, what happened to the
          pair they replaced, or whether the fit worked out. We are collecting that
          in the open, and the headline numbers stay public — a brand does not have
          to pay to see what shoppers are telling everyone.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/brands" className="btn-primary">
            See the brand directory <ArrowRight size={15} />
          </Link>
          <Link href="/trends" className="btn-ghost bg-white/10 text-white hover:bg-white/20">
            What India is searching for
          </Link>
        </div>
      </div>
    </div>
  );
}
