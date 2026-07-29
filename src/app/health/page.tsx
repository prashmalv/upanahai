"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HealthConsent } from "@/components/HealthConsent";
import { FootHealthSummary, type Screening } from "@/components/FootHealthSummary";
import { FollowUp } from "@/components/FollowUp";
import { Activity, HeartPulse, AlertTriangle } from "lucide-react";

type Log = {
  id: string;
  date: string;
  steps: number;
  distanceKm: number;
  activity: string;
  painArea: string;
  numbness: boolean;
  woundOrSore: boolean;
  swelling: boolean;
};

const ACTIVITIES = ["walk", "run", "gym", "standing"];
const PAIN = ["none", "heel", "arch", "forefoot", "knee"];

export default function HealthPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [consented, setConsented] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [hasFootProfile, setHasFootProfile] = useState(false);

  const [steps, setSteps] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [activity, setActivity] = useState("walk");
  const [painArea, setPainArea] = useState("none");
  const [numbness, setNumbness] = useState(false);
  const [woundOrSore, setWound] = useState(false);
  const [swelling, setSwelling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/health");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const d = await res.json();
    setAuthed(true);
    setConsented(!!d.consented);
    setLogs(d.logs || []);
    setScreening(d.screening || null);
    setHasFootProfile(!!d.hasFootProfile);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps,
        distanceKm,
        activity,
        painArea: painArea === "none" ? "" : painArea,
        numbness,
        woundOrSore,
        swelling
      })
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(d.error || "Could not save");
      return;
    }
    setSteps("");
    setDistanceKm("");
    setNumbness(false);
    setWound(false);
    setSwelling(false);
    await load();
  }

  return (
    <div className="container-app py-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip mx-auto"><HeartPulse size={13} /> Foot health</span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
          Your feet, and what they&apos;re telling you
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Log how much you&apos;re on your feet and where it hurts. We turn that, plus
          your measurements, into footwear features likely to help — and a straight
          answer on when to stop reading a shoe website and see a clinician.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          <Link href="/foot-health" className="font-semibold text-brand-600 hover:underline">
            How this screening works, and what it can&apos;t do
          </Link>{" "}
          — worth two minutes before you rely on it.
        </p>
      </div>

      {authed === false && (
        <div className="mx-auto mt-8 max-w-md card p-6 text-center">
          <p className="text-slate-600">
            Sign in to keep a foot health log — it&apos;s tied to your account so the
            summary can build up over time.
          </p>
          <Link href="/login?next=/health" className="btn-primary mt-4">Sign in</Link>
        </div>
      )}

      {authed && (
        <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <HealthConsent onChange={(c) => { setConsented(c); void load(); }} />

            {consented && (
              <form onSubmit={add} className="card space-y-3 p-5">
                <p className="flex items-center gap-2 font-bold text-slate-900">
                  <Activity size={16} /> Log today
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-slate-500">Steps</span>
                    <input
                      className="input mt-1" type="number" min={0} placeholder="6000"
                      value={steps} onChange={(e) => setSteps(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Distance (km)</span>
                    <input
                      className="input mt-1" type="number" min={0} step="0.1" placeholder="4.5"
                      value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-slate-500">Mostly</span>
                  <select className="input mt-1" value={activity} onChange={(e) => setActivity(e.target.value)}>
                    {ACTIVITIES.map((a) => (
                      <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-500">Any pain today?</span>
                  <select className="input mt-1" value={painArea} onChange={(e) => setPainArea(e.target.value)}>
                    {PAIN.map((p) => (
                      <option key={p} value={p}>
                        {p === "none" ? "No pain" : p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Asked plainly and separately, because these change the answer
                    entirely — they route to a clinician, not to a shoe. */}
                <fieldset className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <legend className="flex items-center gap-1.5 px-1 text-xs font-bold text-amber-900">
                    <AlertTriangle size={12} /> Any of these today?
                  </legend>
                  {([
                    ["numbness", numbness, setNumbness, "Numbness or loss of feeling"],
                    ["wound", woundOrSore, setWound, "A sore, blister or wound that isn't healing"],
                    ["swelling", swelling, setSwelling, "Swelling, especially on one side"]
                  ] as const).map(([k, val, setter, label]) => (
                    <label key={k} className="mt-1.5 flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox" checked={val}
                        onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300"
                      />
                      <span className="text-xs text-amber-900">{label}</span>
                    </label>
                  ))}
                  <p className="mt-2 text-[11px] leading-snug text-amber-800">
                    If you tick any of these we&apos;ll point you to a clinician rather
                    than suggest footwear.
                  </p>
                </fieldset>

                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button className="btn-primary w-full" disabled={saving}>
                  {saving ? "Saving…" : "Add to my log"}
                </button>
              </form>
            )}

            {consented && logs.length > 0 && (
              <div className="card p-5">
                <p className="font-bold text-slate-900">Recent days</p>
                <ul className="mt-3 divide-y divide-slate-100">
                  {logs.slice(0, 8).map((l) => (
                    <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-600">
                        {new Date(l.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {" · "}{l.activity}
                      </span>
                      <span className="flex items-center gap-2 text-slate-500">
                        {l.distanceKm > 0 && <span>{l.distanceKm} km</span>}
                        {l.painArea && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                            {l.painArea}
                          </span>
                        )}
                        {(l.numbness || l.woundOrSore || l.swelling) && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                            flagged
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {consented && <FollowUp onDone={() => void load()} />}
            {consented && screening ? (
              <FootHealthSummary screening={screening} hasFootProfile={hasFootProfile} />
            ) : (
              <div className="card p-6 text-sm text-slate-500">
                Your foot health summary appears here once you&apos;ve agreed to health
                logging and added a day or a foot measurement.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
