"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, X } from "lucide-react";

type Episode = {
  id: string;
  startedAt: string;
  baselinePainDays: number;
  baselinePainAreas: string;
  needs: string;
};

const PAIN = [
  { v: "gone", label: "Gone" },
  { v: "better", label: "Better" },
  { v: "same", label: "About the same" },
  { v: "worse", label: "Worse" }
] as const;

const CHANGED = [
  { v: "yes", label: "Yes, changed" },
  { v: "partly", label: "Partly" },
  { v: "no", label: "No change" }
] as const;

/**
 * Asks, four weeks on, whether anything actually improved.
 *
 * Two questions and an optional rating — nothing more. Every extra field costs
 * responses, and a follow-up nobody answers measures nothing. "Not now" is offered
 * as plainly as the answers, because a skip we record honestly is worth more than
 * a reply we nagged out of someone.
 */
export function FollowUp({ onDone }: { onDone?: () => void }) {
  const [ep, setEp] = useState<Episode | null>(null);
  const [painChange, setPain] = useState("");
  const [changedFootwear, setChanged] = useState("");
  const [comfortRating, setComfort] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/health/follow-up");
      if (!res.ok) return;
      const d = await res.json();
      setEp(d.episode || null);
    })();
  }, []);

  async function send(payload: Record<string, unknown>) {
    if (!ep) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/health/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId: ep.id, ...payload })
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Could not save that");
      return;
    }
    if (payload.dismiss) {
      setEp(null);
    } else {
      setThanks(true);
      setEp(null);
    }
    onDone?.();
  }

  if (thanks) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
        Thank you — that answer is the only way we can tell whether this guidance is
        worth anything. We&apos;ll ask again if your log suggests something new.
      </div>
    );
  }

  if (!ep) return null;

  const weeks = Math.max(
    1,
    Math.round((Date.now() - new Date(ep.startedAt).getTime()) / (7 * 24 * 3600 * 1000))
  );

  return (
    <div className="rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-200">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-black text-indigo-900">
          <CalendarCheck size={17} /> How are your feet now?
        </p>
        <button
          onClick={() => void send({ dismiss: true })}
          disabled={busy}
          className="rounded-lg p-1 text-indigo-400 hover:bg-white hover:text-indigo-700"
          aria-label="Not now"
          title="Not now"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-1.5 text-sm text-indigo-900">
        About {weeks} {weeks === 1 ? "week" : "weeks"} ago you were logging pain
        {ep.baselinePainAreas ? ` (${ep.baselinePainAreas.split(",").join(", ")})` : ""} on{" "}
        {ep.baselinePainDays} {ep.baselinePainDays === 1 ? "day" : "days"}, and we
        suggested {ep.needs.split(",").map((n) => n.replace(/-/g, " ")).join(", ")}. Two
        questions:
      </p>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold uppercase tracking-wide text-indigo-700">
          Did you change your footwear?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CHANGED.map((c) => (
            <Choice
              key={c.v}
              label={c.label}
              active={changedFootwear === c.v}
              onClick={() => setChanged(c.v)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold uppercase tracking-wide text-indigo-700">
          And the pain?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PAIN.map((p) => (
            <Choice
              key={p.v}
              label={p.label}
              active={painChange === p.v}
              onClick={() => setPain(p.v)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold uppercase tracking-wide text-indigo-700">
          Comfort of what you wear now (optional)
        </legend>
        <div className="mt-2 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setComfort(n)}
              className={`h-9 w-9 rounded-xl text-sm font-bold ${
                comfortRating >= n
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-indigo-400 ring-1 ring-indigo-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <input
        className="input mt-4 bg-white"
        placeholder="Anything else? (optional)"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void send({ painChange, changedFootwear, comfortRating, note })}
          disabled={busy || !painChange || !changedFootwear}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "Saving…" : "Send"}
        </button>
        <button
          onClick={() => void send({ dismiss: true })}
          disabled={busy}
          className="text-sm font-semibold text-indigo-700 hover:underline"
        >
          Rather not say
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-indigo-800">
        We use these answers in aggregate to check whether our guidance helps, and to
        drop the parts that don&apos;t.
      </p>
    </div>
  );
}

function Choice({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
        active ? "bg-indigo-600 text-white" : "bg-white text-indigo-800 ring-1 ring-indigo-200"
      }`}
    >
      {label}
    </button>
  );
}
