"use client";

import { useState } from "react";
import Link from "next/link";
import { QUIZ } from "@/lib/footFacts";
import { Check, X, RotateCcw, ArrowRight, Trophy } from "lucide-react";

/**
 * A short quiz on how shoe sizing actually works.
 *
 * It exists because this is the one kind of engagement we can offer honestly on
 * day one. A "trending shoes" board needs traffic we don't have yet and sales
 * data nobody publishes; a quiz needs only facts we can source, and every
 * question doubles as an argument for why measuring your feet is worth two
 * minutes. The explanation after each answer is the actual payload — the score is
 * just what makes people read it.
 *
 * Entirely client-side and unauthenticated: no result is stored, so there is
 * nothing to consent to and nothing to leak.
 */
export function SizeQuiz({ compact = false }: { compact?: boolean }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUIZ[i];
  const last = i === QUIZ.length - 1;

  function pick(n: number) {
    if (picked !== null) return;
    setPicked(n);
    if (n === q.answer) setScore((s) => s + 1);
  }

  function next() {
    if (last) {
      setDone(true);
      return;
    }
    setI((n) => n + 1);
    setPicked(null);
  }

  function restart() {
    setI(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    const verdict =
      score === QUIZ.length ? "You know sizing better than most retailers."
      : score >= QUIZ.length - 2 ? "Better than most. The rest is what trips shoppers up."
      : score >= QUIZ.length / 2 ? "Middling — and that's the norm, which is the problem."
      : "Almost nobody gets these right. That's exactly why shoes don't fit.";

    return (
      <div className="card p-6 text-center">
        <Trophy size={28} className="mx-auto text-amber-500" />
        <p className="mt-3 text-3xl font-black text-slate-900">
          {score} / {QUIZ.length}
        </p>
        <p className="mt-1 text-slate-600">{verdict}</p>
        <p className="mx-auto mt-4 max-w-md text-sm text-slate-500">
          Every one of those answers is arithmetic or a published convention — no
          guesswork. The next step is the number none of them can give you: how long
          your foot actually is.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/foot-scan" className="btn-primary">
            Measure my feet <ArrowRight size={15} />
          </Link>
          <button onClick={restart} className="btn-ghost">
            <RotateCcw size={14} /> Play again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          Question {i + 1} of {QUIZ.length}
        </p>
        <p className="text-xs font-semibold text-slate-400">Score {score}</p>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((i + (picked !== null ? 1 : 0)) / QUIZ.length) * 100}%` }}
        />
      </div>

      <p className={`mt-4 font-black text-slate-900 ${compact ? "text-base" : "text-lg"}`}>
        {q.q}
      </p>

      <div className="mt-4 space-y-2">
        {q.options.map((opt, n) => {
          const isAnswer = n === q.answer;
          const isPicked = picked === n;
          const revealed = picked !== null;
          return (
            <button
              key={opt}
              onClick={() => pick(n)}
              disabled={revealed}
              className={`flex w-full items-start gap-2 rounded-xl px-4 py-3 text-left text-sm transition ${
                !revealed
                  ? "bg-slate-50 hover:bg-slate-100"
                  : isAnswer
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : isPicked
                      ? "bg-rose-50 ring-1 ring-rose-200"
                      : "bg-slate-50 opacity-60"
              }`}
            >
              {revealed && isAnswer && (
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              )}
              {revealed && isPicked && !isAnswer && (
                <X size={16} className="mt-0.5 shrink-0 text-rose-600" />
              )}
              <span
                className={
                  revealed && isAnswer
                    ? "font-semibold text-emerald-900"
                    : revealed && isPicked
                      ? "text-rose-900"
                      : "text-slate-700"
                }
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm leading-relaxed text-slate-700">{q.because}</p>
          {/* The source line is the point: it is what we would show a brand that
              asked where a claim came from. */}
          <p className="mt-2 text-xs text-slate-400">Source — {q.source}</p>
          <button onClick={next} className="btn-primary mt-4 w-full justify-center">
            {last ? "See my score" : "Next question"} <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
