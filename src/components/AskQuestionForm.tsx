"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Search } from "lucide-react";

const CATEGORIES = [
  "running", "walking", "sports", "casual", "formal", "sandals", "orthopedic", "school"
];

export function AskQuestionForm({ signedIn }: { signedIn: boolean }) {
  const [kind, setKind] = useState<"find" | "advice">("find");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (!signedIn) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        <p className="font-bold text-slate-900">Ask the community</p>
        <p className="mt-2">
          <a href="/login?next=/community" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </a>{" "}
          to post a question. Signing in also lets you track answers to your own
          questions from your account.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/community/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, body, brand, category, city, budget })
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not post your question");
      return;
    }
    router.push(`/community/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <p className="font-bold text-slate-900">Ask the community</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Shoppers and brand representatives can both answer. Answers are public.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {([
          { k: "find", label: "Help me find it", icon: Search },
          { k: "advice", label: "Should I buy it?", icon: HelpCircle }
        ] as const).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              kind === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder={
          kind === "find"
            ? "e.g. Where can I get Campus Mike 2.0 in size UK 9 in Indore?"
            : "e.g. Is Skechers Go Walk 6 worth ₹5,400 for daily walking?"
        }
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        minLength={10}
        maxLength={200}
      />

      <textarea
        className="input min-h-[110px]"
        placeholder="Add details — your size, budget, what you'll use them for, any foot problems…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={20}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder="Brand (optional)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Shoe type (optional)</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Your city (optional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Budget ₹ (optional)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button className="btn-primary w-full" disabled={saving}>
        {saving ? "Posting…" : "Post question"}
      </button>
    </form>
  );
}
