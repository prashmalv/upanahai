"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Footprints, TrendingUp, HeartPulse, ArrowRight } from "lucide-react";

type Log = {
  id: string;
  date: string;
  steps: number;
  distanceKm: number;
  activity: string;
  painArea: string;
};

const ACTIVITIES = ["walk", "run", "gym", "standing"];
const PAIN = ["none", "heel", "arch", "knee"];

export default function HealthPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [steps, setSteps] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [activity, setActivity] = useState("walk");
  const [painArea, setPainArea] = useState("none");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/health");
    if (res.status === 401) { setAuthed(false); return; }
    const data = await res.json();
    setAuthed(true);
    setLogs(data.logs);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps, distanceKm, activity, painArea: painArea === "none" ? "" : painArea })
    });
    setSaving(false);
    if (res.status === 401) { window.location.href = "/login?next=/health"; return; }
    setSteps(""); setDistanceKm("");
    load();
  }

  if (authed === false) {
    return (
      <div className="container-app grid min-h-[50vh] place-items-center py-10 text-center">
        <div>
          <HeartPulse className="mx-auto text-brand-500" size={40} />
          <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Health &amp; activity tracker</h1>
          <p className="mt-1 max-w-md text-slate-500">
            Log your daily walks, runs and any foot discomfort. Upanah.AI turns this
            into personalized footwear recommendations.
          </p>
          <Link href="/login?next=/health" className="btn-primary mt-5">Login to start</Link>
        </div>
      </div>
    );
  }

  const totals = logs.reduce(
    (a, l) => ({ steps: a.steps + l.steps, km: a.km + l.distanceKm }),
    { steps: 0, km: 0 }
  );
  const suggestions = buildSuggestions(logs);

  return (
    <div className="container-app py-10">
      <div className="flex items-center gap-2">
        <Activity className="text-brand-600" />
        <h1 className="text-2xl font-extrabold text-slate-900">Health &amp; activity</h1>
      </div>

      {/* summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={Footprints} label="Total steps (30d)" value={totals.steps.toLocaleString("en-IN")} />
        <Stat icon={TrendingUp} label="Distance (30d)" value={`${totals.km.toFixed(1)} km`} />
        <Stat icon={HeartPulse} label="Entries" value={String(logs.length)} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* log form */}
        <form onSubmit={add} className="card h-fit space-y-3 p-5">
          <p className="font-bold text-slate-900">Log today&apos;s activity</p>
          <input className="input" type="number" placeholder="Steps" value={steps} onChange={(e) => setSteps(e.target.value)} />
          <input className="input" type="number" step="0.1" placeholder="Distance (km)" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm text-slate-600">Activity</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => (
                <button type="button" key={a} onClick={() => setActivity(a)} className={activity === a ? "btn-primary" : "btn-ghost"}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Any discomfort?</label>
            <div className="flex flex-wrap gap-2">
              {PAIN.map((p) => (
                <button type="button" key={p} onClick={() => setPainArea(p)} className={painArea === p ? "btn-primary" : "btn-ghost"}>{p}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full" disabled={saving}>{saving ? "Saving…" : "Add entry"}</button>
        </form>

        {/* suggestions + history */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Personalized for you</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {suggestions.map((s) => (
                <Link key={s.title} href={s.href} className="card group flex items-center justify-between p-4 transition hover:-translate-y-1">
                  <div>
                    <p className="font-semibold text-slate-900">{s.title}</p>
                    <p className="text-sm text-slate-500">{s.reason}</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-600" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent entries</h2>
            <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              {logs.length === 0 && <p className="p-4 text-sm text-slate-500">No entries yet.</p>}
              {logs.map((l, i) => (
                <div key={l.id} className={`flex items-center justify-between p-3 text-sm ${i % 2 ? "bg-white" : "bg-slate-50/60"}`}>
                  <span className="text-slate-500">{new Date(l.date).toLocaleDateString("en-IN")}</span>
                  <span className="font-medium capitalize text-slate-700">{l.activity}</span>
                  <span className="text-slate-600">{l.steps.toLocaleString("en-IN")} steps</span>
                  <span className="text-slate-600">{l.distanceKm} km</span>
                  <span className={l.painArea ? "text-rose-500" : "text-emerald-500"}>{l.painArea || "no pain"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon size={18} /></span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function buildSuggestions(logs: Log[]) {
  const out: { title: string; reason: string; href: string }[] = [];
  const painCounts: Record<string, number> = {};
  let runCount = 0, walkCount = 0, totalKm = 0;
  for (const l of logs) {
    if (l.painArea) painCounts[l.painArea] = (painCounts[l.painArea] || 0) + 1;
    if (l.activity === "run") runCount++;
    if (l.activity === "walk") walkCount++;
    totalKm += l.distanceKm;
  }

  if ((painCounts["heel"] || 0) + (painCounts["arch"] || 0) > 0) {
    out.push({
      title: "Arch-support / orthopedic shoes",
      reason: "You've logged heel or arch discomfort — extra support can help.",
      href: "/search?category=orthopedic"
    });
  }
  if (painCounts["knee"]) {
    out.push({
      title: "Max-cushion shock absorbers",
      reason: "Knee discomfort noted — cushioned soles reduce impact.",
      href: "/search?q=cushioned+shock+absorption+running"
    });
  }
  if (runCount >= 2 || totalKm > 15) {
    out.push({
      title: "Performance running shoes",
      reason: "You run regularly — lightweight, responsive shoes suit you.",
      href: "/search?category=running"
    });
  }
  if (walkCount >= 2) {
    out.push({
      title: "Comfort walking shoes",
      reason: "Frequent walker — slip-on comfort keeps you going longer.",
      href: "/search?category=walking"
    });
  }
  if (out.length === 0) {
    out.push({
      title: "Start with all-day comfort",
      reason: "Log a few activities and we'll tailor picks to your routine.",
      href: "/search?category=casual"
    });
  }
  return out.slice(0, 4);
}
