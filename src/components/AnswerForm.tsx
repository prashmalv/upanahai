"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ThumbsUp } from "lucide-react";

export function AnswerForm({
  questionId,
  signedIn,
  brandName
}: {
  questionId: string;
  signedIn: boolean;
  brandName?: string;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (!signedIn) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-100">
        <a
          href={`/login?next=/community/${questionId}`}
          className="font-semibold text-brand-600 hover:underline"
        >
          Sign in
        </a>{" "}
        to answer. Anyone can help — shoppers and brand representatives alike.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/community/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, body })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not post your answer");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900">Your answer</p>
        {brandName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
            <BadgeCheck size={11} /> Posting as {brandName}
          </span>
        )}
      </div>
      <textarea
        className="input min-h-[110px]"
        placeholder="Share what you know — where you found it, what it cost, how it fits…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="btn-primary" disabled={saving}>
        {saving ? "Posting…" : "Post answer"}
      </button>
    </form>
  );
}

export function HelpfulButton({
  answerId,
  initial,
  canVote
}: {
  answerId: string;
  initial: number;
  canVote: boolean;
}) {
  const [count, setCount] = useState(initial);
  const [voted, setVoted] = useState(false);

  async function vote() {
    if (voted || !canVote) return;
    const res = await fetch("/api/community/helpful", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCount(data.helpful ?? count + 1);
      setVoted(true);
    }
  }

  return (
    <button
      onClick={vote}
      disabled={!canVote || voted}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
        voted
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-white text-slate-600 ring-slate-200 enabled:hover:bg-slate-50 disabled:opacity-50"
      }`}
      title={canVote ? "Mark this answer helpful" : "Sign in to vote"}
    >
      <ThumbsUp size={12} /> Helpful {count > 0 && `· ${count}`}
    </button>
  );
}
