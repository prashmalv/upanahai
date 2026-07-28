"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Trash2, Info } from "lucide-react";

/**
 * Consent gate for health data.
 *
 * Two separate switches on purpose. Bundling "let me use the tracker" with "use my
 * measurements in your research statistics" would make the second one unavoidable,
 * and consent you cannot refuse without losing the feature isn't freely given.
 *
 * Withdrawal deletes the data and says so before you click, because a switch that
 * only hides data we still hold would be misleading.
 */
export function HealthConsent({
  onChange
}: {
  onChange?: (consented: boolean) => void;
}) {
  const [state, setState] = useState<{
    health: boolean;
    research: boolean;
    diabetes: boolean;
    stale: boolean;
    loading: boolean;
  }>({ health: false, research: false, diabetes: false, stale: false, loading: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/health-consent");
    if (res.status === 401) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const d = await res.json();
    setState({
      health: !!d.health,
      research: !!d.research,
      diabetes: !!d.diabetes,
      stale: !!d.stale,
      loading: false
    });
    onChange?.(!!d.health);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function set(patch: { health?: boolean; research?: boolean; diabetes?: boolean }) {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/health-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Could not update your choice");
      return;
    }
    setState((s) => ({
      ...s,
      health: !!d.health,
      research: !!d.research,
      diabetes: !!d.diabetes,
      stale: false
    }));
    onChange?.(!!d.health);
  }

  if (state.loading) {
    return <div className="card animate-pulse p-5 text-sm text-slate-400">Checking your preferences…</div>;
  }

  if (!state.health) {
    return (
      <div className="card p-5">
        <p className="flex items-center gap-2 font-bold text-slate-900">
          <ShieldCheck size={16} className="text-brand-600" /> Before we log anything
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Foot measurements, where it hurts and how much you walk are health
          information, so we ask before storing any of it. If you say no, everything
          else on Upanah.AI still works — you just won&apos;t get the personal foot
          health summary.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          <li>· Stored against your account, not sold and not shared with brands.</li>
          <li>· You can withdraw at any time, and withdrawing <strong>deletes</strong> it.</li>
          <li>· This is a wellness tool, not a medical device — it doesn&apos;t diagnose anything.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Full detail in our{" "}
          <Link href="/data-and-privacy" className="font-semibold text-brand-600 hover:underline">
            data &amp; privacy notice
          </Link>
          .
        </p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <button
          onClick={() => set({ health: true })}
          disabled={busy}
          className="btn-primary mt-4 w-full"
        >
          {busy ? "Saving…" : "I agree — start my foot health log"}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 font-bold text-slate-900">
        <ShieldCheck size={16} className="text-emerald-600" /> Your health data
      </p>

      {state.stale && (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          Our notice has changed since you agreed. Please review it and confirm again.
        </p>
      )}

      {/* Asked because it changes the advice, not because it is nice to know:
          reduced sensation means a bad fit does its damage unfelt, so the
          referral threshold drops. Optional, and clearing it is one click. */}
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
        <input
          type="checkbox"
          checked={state.diabetes}
          disabled={busy}
          onChange={(e) => set({ diabetes: e.target.checked })}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        <span className="text-sm text-slate-700">
          <span className="font-semibold">I have diabetes.</span> Tell us and we lower
          the point at which we stop suggesting footwear and suggest a foot examination
          instead — reduced feeling in the feet means pressure damage can go unnoticed.
          Optional, and you can untick it at any time.
        </span>
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={state.research}
          disabled={busy}
          onChange={(e) => set({ research: e.target.checked })}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        <span className="text-sm text-slate-700">
          <span className="font-semibold">Optional:</span> include my measurements in
          anonymised statistics about Indian foot sizes. No name, email or exact
          location — only the measurement, age band and state. This is what lets us
          show brands how Indian feet actually differ from the lasts they use.
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        onClick={() => {
          if (
            confirm(
              "Withdraw consent and delete your foot measurements and activity log? This cannot be undone."
            )
          ) {
            void set({ health: false });
          }
        }}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
      >
        <Trash2 size={13} /> Withdraw consent and delete my health data
      </button>
    </div>
  );
}
