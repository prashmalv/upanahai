"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

const ASPECTS = [
  { key: "quality", label: "Build quality" },
  { key: "comfort", label: "Comfort" },
  { key: "durability", label: "Durability" },
  { key: "valueScore", label: "Value for money" }
] as const;

export function BrandReviewForm({
  brand,
  signedIn,
  existing
}: {
  brand: string;
  signedIn: boolean;
  existing?: {
    rating: number;
    quality: number;
    comfort: number;
    durability: number;
    valueScore: number;
    sizingAccuracy: string;
    comment: string;
  } | null;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [aspects, setAspects] = useState<Record<string, number>>({
    quality: existing?.quality ?? 0,
    comfort: existing?.comfort ?? 0,
    durability: existing?.durability ?? 0,
    valueScore: existing?.valueScore ?? 0
  });
  const [sizing, setSizing] = useState(existing?.sizingAccuracy ?? "true-to-size");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!signedIn) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-slate-100">
        <a
          href={`/login?next=/brands/${encodeURIComponent(brand)}`}
          className="font-semibold text-brand-600 hover:underline"
        >
          Sign in
        </a>{" "}
        to rate {brand}. We ask for an account so the brand scorecard stays
        trustworthy — one honest review per person.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("saving");
    const res = await fetch("/api/brand-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand, rating, ...aspects, sizingAccuracy: sizing, comment })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not save your review");
      setState("idle");
      return;
    }
    setState("done");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <div>
        <p className="font-bold text-slate-900">
          {existing ? `Update your review of ${brand}` : `Rate ${brand}`}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Honest feedback here is what makes this a neutral platform.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Overall</label>
        <Stars value={rating} onChange={setRating} size={26} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ASPECTS.map((a) => (
          <div key={a.key}>
            <label className="text-sm text-slate-600">{a.label}</label>
            <Stars
              value={aspects[a.key]}
              onChange={(v) => setAspects((s) => ({ ...s, [a.key]: v }))}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">
          How does {brand} sizing run?
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {["small", "true-to-size", "large"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSizing(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                sizing === s
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {s.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="input min-h-[100px]"
        placeholder={`What should other shoppers know about ${brand}? Fit, durability, service…`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
        minLength={10}
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {state === "done" && (
        <p className="text-sm font-medium text-emerald-600">
          Thanks — your review is live on the brand scorecard.
        </p>
      )}

      <button className="btn-primary" disabled={state === "saving" || !rating}>
        {state === "saving" ? "Saving…" : existing ? "Update review" : "Post review"}
      </button>
    </form>
  );
}

function Stars({
  value,
  onChange,
  size = 20
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="mt-1 flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="transition hover:scale-110"
        >
          <Star
            size={size}
            className={
              n <= value ? "fill-accent-500 text-accent-500" : "text-slate-300"
            }
          />
        </button>
      ))}
    </div>
  );
}
