"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SURVEY, MIN_ANSWERS, type QuestionResult } from "@/lib/buyerSurvey";
import { Check, ArrowRight, ArrowLeft, Users, Info, RotateCcw } from "lucide-react";

/**
 * The buyer-behaviour survey.
 *
 * One question at a time, and the moment you answer you see what everyone else
 * said. That exchange is the reason anyone finishes: the question is not a favour
 * being asked, it is a trade. Skipping is always available and never nags, because
 * a forced answer is a wrong answer in the dataset.
 *
 * No login, no personal details. Requiring an account would bias the sample
 * towards people already invested in the platform, which is precisely the group
 * whose habits we can already infer.
 */
export function BuyerSurvey() {
  const [i, setI] = useState(0);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, QuestionResult>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/survey");
      const d = await res.json();
      setMine(d.mine || {});
      setResults(
        Object.fromEntries((d.results as QuestionResult[]).map((r) => [r.key, r]))
      );
      // Open on the first question they have not answered.
      const next = SURVEY.findIndex((q) => !(d.mine || {})[q.key]);
      setI(next === -1 ? SURVEY.length : next);
      setLoaded(true);
    })();
  }, []);

  const q = SURVEY[i];
  const answered = q ? mine[q.key] : undefined;
  const result = q ? results[q.key] : undefined;
  const done = i >= SURVEY.length;
  const answeredCount = Object.keys(mine).length;

  async function answer(choice: string) {
    if (!q || busy) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q.key, choice })
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Could not record that");
      return;
    }
    setMine((m) => ({ ...m, [q.key]: choice }));
    if (d.result) setResults((r) => ({ ...r, [q.key]: d.result }));
  }

  if (!loaded) {
    return <div className="card animate-pulse p-6 text-sm text-slate-400">Loading…</div>;
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <Users size={26} className="mx-auto text-indigo-600" />
        <p className="mt-3 text-lg font-black text-slate-900">
          That&apos;s all {SURVEY.length} — thank you
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          You answered {answeredCount}. Nothing here is tied to your name, and the
          results below update as more people take it. This is the part of footwear
          nobody measures, and it only becomes worth reading if enough people answer.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/foot-scan" className="btn-primary">
            Now find your size <ArrowRight size={15} />
          </Link>
          <button onClick={() => setI(0)} className="btn-ghost">
            <RotateCcw size={14} /> Review my answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          Question {i + 1} of {SURVEY.length}
        </p>
        <p className="text-xs text-slate-400">No sign-in, no personal details</p>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(answeredCount / SURVEY.length) * 100}%` }}
        />
      </div>

      <p className="mt-4 text-lg font-black text-slate-900">{q.question}</p>
      <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
        <Info size={12} className="mt-0.5 shrink-0" /> {q.why}
      </p>

      <div className="mt-4 space-y-2">
        {q.choices.map((c) => {
          const picked = answered === c.key;
          const row = result?.choices.find((x) => x.key === c.key);
          const pct = row?.pct ?? null;
          return (
            <button
              key={c.key}
              onClick={() => answer(c.key)}
              disabled={busy}
              className={`relative w-full overflow-hidden rounded-xl px-4 py-3 text-left text-sm transition ${
                picked ? "bg-indigo-50 ring-1 ring-indigo-300" : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              {/* Once enough people have answered, the row fills to show the share. */}
              {answered && pct !== null && (
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${picked ? "bg-indigo-200/60" : "bg-slate-200/70"}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex items-start gap-2">
                  {picked && <Check size={15} className="mt-0.5 shrink-0 text-indigo-600" />}
                  <span className={picked ? "font-semibold text-indigo-900" : "text-slate-700"}>
                    {c.label}
                  </span>
                </span>
                {answered && (
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {pct !== null ? `${pct}%` : `${row?.count ?? 0}`}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {answered && result && result.total < MIN_ANSWERS && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          {result.total} {result.total === 1 ? "person has" : "people have"} answered
          this so far — too few to show a percentage that would mean anything, so the
          raw counts are shown instead.
        </p>
      )}
      {answered && result && result.total >= MIN_ANSWERS && (
        <p className="mt-3 text-xs text-slate-500">
          Out of {result.total} people who answered this. You can change your answer —
          it moves your vote rather than adding another.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          disabled={i === 0}
          className="btn-ghost disabled:opacity-40"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => setI((n) => n + 1)} className="btn-primary">
          {answered ? "Next" : "Skip this one"} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
