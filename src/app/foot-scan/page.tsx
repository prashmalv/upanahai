"use client";

import { useState } from "react";
import Link from "next/link";
import { CameraCapture } from "@/components/CameraCapture";
import { FootMeasureCanvas } from "@/components/FootMeasureCanvas";
import type { ReferenceKey } from "@/lib/homography";
import {
  ScanLine, Ruler, Info, CheckCircle2, AlertTriangle, Pencil,
  Crosshair, Search, Camera
} from "lucide-react";

type Sizes = {
  uk: number;
  eu: number;
  us: number;
  ukRange: [number, number];
  widthCategory: string;
  recommendation: string;
  childScale: boolean;
};

type Result = {
  lengthMm: number;
  widthMm: number;
  widthEstimated: boolean;
  archType: string;
  confidence: number;
  source: "measured" | "ai" | "manual";
  toleranceMm: number;
  quality: "good" | "rough" | "unusable";
  sizeIsReliable: boolean;
  audience: "men" | "women" | "kids";
  sizes: Sizes;
  note?: string;
  aiUsed: boolean;
};

/** What actually moves the needle on accuracy, in the order it matters. */
const GUIDANCE = [
  "Stand up — a weight-bearing foot is 2-5 mm longer than a sitting one, and shoe charts assume standing.",
  "Bare foot or a thin sock. A thick sock adds millimetres you won't have in the shoe.",
  "Put your heel against a wall, with the sheet flat on hard floor (not carpet).",
  "Hold the phone directly above the foot, screen level. Tilt is the single biggest source of error, so the on-screen level has to go green before the shutter unlocks.",
  "Get the whole sheet and the whole foot inside the frame, in even light with no shadow across the toes.",
  "Measure both feet and use the longer one. Most people differ by 3-6 mm.",
  "Measure at the end of the day, when feet are at their largest."
];

export default function FootScanPage() {
  const [reference, setReference] = useState<ReferenceKey>("a4");
  const [audience, setAudience] = useState<"men" | "women" | "kids">("men");
  const [mode, setMode] = useState<"precise" | "photo" | "manual">("precise");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [manualMm, setManualMm] = useState("");

  async function post(payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch("/api/foot-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, audience })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!result) return;
    const res = await fetch("/api/foot-scan/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    });
    if (res.status === 401) {
      window.location.href = "/login?next=/foot-scan";
      return;
    }
    if (res.ok) setSaved(true);
  }

  return (
    <div className="container-app py-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip mx-auto"><ScanLine size={13} /> Foot Fit Scan</span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Find your shoe size</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Measure your foot against a sheet of paper and we convert it to UK, EU and
          US sizes with a width recommendation.
        </p>
      </div>

      {/* The honest framing, stated before anyone measures anything. */}
      <div className="mx-auto mt-6 max-w-4xl rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Please read this first.</strong> One
            shoe size is only 8.5 mm, so small errors change the answer. Our photo
            estimate is produced by AI and <strong className="font-semibold">can be
            wrong</strong> — treat it as a starting point, not a fact. If you already
            know your size, or you&apos;ve measured with a ruler, enter it yourself
            and search with that number. It will always beat a guess.
          </span>
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-8 md:grid-cols-2">
        {/* ---------------- input ---------------- */}
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-600">Who is this for?</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["men", "women", "kids"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={audience === a ? "btn-primary" : "btn-ghost"}
              >
                {a === "kids" ? "Kids" : a === "men" ? "Men" : "Women"}
              </button>
            ))}
          </div>
          {audience === "kids" && (
            <p className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              Children&apos;s sizes use a different scale entirely, and we add growing
              room. Re-measure every 3-4 months — feet at this age change fast.
            </p>
          )}

          <label className="mb-1.5 block text-sm font-medium text-slate-600">Reference object</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {([["a4", "A4 sheet"], ["letter", "US Letter"], ["card", "Bank card"]] as const).map(
              ([k, label]) => (
                <button
                  key={k}
                  onClick={() => setReference(k)}
                  className={reference === k ? "btn-primary" : "btn-ghost"}
                >
                  {label}
                </button>
              )
            )}
          </div>
          {reference === "card" && (
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              A bank card is small, so any tap error is magnified about 3x compared
              with an A4 sheet. Use paper if you have it.
            </p>
          )}

          <label className="mb-1.5 block text-sm font-medium text-slate-600">How do you want to measure?</label>
          <div className="mb-4 grid gap-2">
            {([
              ["precise", Crosshair, "Precise", "Tap the sheet corners and your heel/toe. Most accurate — corrects for camera tilt."],
              ["photo", Camera, "Quick AI estimate", "One photo, AI reads it. Fast, but an estimate."],
              ["manual", Pencil, "I'll enter it myself", "You measured with a ruler. Most reliable of all."]
            ] as const).map(([k, Icon, title, desc]) => (
              <button
                key={k}
                onClick={() => { setMode(k); setResult(null); setError(null); }}
                className={`flex items-start gap-3 rounded-xl p-3 text-left ring-1 transition ${
                  mode === k
                    ? "bg-brand-50 ring-brand-300"
                    : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${mode === k ? "text-brand-600" : "text-slate-400"}`} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500">{desc}</span>
                </span>
              </button>
            ))}
          </div>

          {mode === "manual" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const mm = Number(manualMm);
                if (!Number.isFinite(mm)) return;
                post({ measuredLengthMm: mm, source: "manual" });
              }}
              className="space-y-3"
            >
              <label className="block text-sm font-medium text-slate-600">
                Foot length in millimetres (heel to longest toe)
              </label>
              <input
                className="input"
                type="number"
                min={90}
                max={360}
                placeholder="e.g. 267"
                value={manualMm}
                onChange={(e) => setManualMm(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                Stand on a sheet of paper, mark behind your heel and past your longest
                toe, then measure between the marks with a ruler.
              </p>
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Converting…" : "Get my size"}
              </button>
            </form>
          ) : photo && mode === "precise" ? (
            <FootMeasureCanvas
              imageDataUrl={photo}
              reference={reference}
              onMeasured={({ lengthMm, widthMm }) =>
                post({ measuredLengthMm: lengthMm, measuredWidthMm: widthMm, source: "measured" })
              }
              onCancel={() => setPhoto(null)}
            />
          ) : (
            <>
              <div className="mb-3 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  {mode === "precise"
                    ? "Take the photo, then tap the sheet's four corners and your heel and toe."
                    : "Keep the camera directly above your foot, with the whole sheet in frame."}
                </span>
              </div>
              {/* requireLevel only here: tilt dominates the error for foot
                  measurement, but is irrelevant for shoe photo matching. */}
              <CameraCapture
                onCapture={(dataUrl) =>
                  mode === "precise" ? setPhoto(dataUrl) : post({ imageDataUrl: dataUrl })
                }
                label={mode === "precise" ? "Take photo to measure" : "Scan foot"}
                aspect="aspect-square"
                requireLevel
              />
            </>
          )}
        </div>

        {/* ---------------- result ---------------- */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Ruler size={18} /> Your result
          </h2>

          {loading && <p className="mt-6 animate-pulse text-slate-500">Working it out…</p>}
          {error && (
            <div className="mt-6 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          )}
          {!loading && !result && !error && (
            <p className="mt-6 text-slate-500">
              Measure, or enter your foot length, to see your size.
            </p>
          )}

          {result && (
            <div className="mt-4 space-y-4">
              {result.sizeIsReliable ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: "UK", v: result.sizes.uk },
                      { l: "EU", v: result.sizes.eu },
                      { l: "US", v: result.sizes.us }
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl bg-brand-600 p-4 text-center text-white">
                        <p className="text-xs opacity-80">
                          {s.l}{result.sizes.childScale && s.l !== "EU" ? " kids" : ""}
                        </p>
                        <p className="text-2xl font-extrabold">{s.v}</p>
                      </div>
                    ))}
                  </div>

                  {result.sizes.ukRange[0] !== result.sizes.ukRange[1] && (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      With ±{result.toleranceMm} mm of measurement uncertainty your true
                      size sits between{" "}
                      <strong>UK {result.sizes.ukRange[0]}</strong> and{" "}
                      <strong>UK {result.sizes.ukRange[1]}</strong>. If you can, try both.
                    </p>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                  <p className="flex items-start gap-2 font-semibold">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    We&apos;re not confident enough to name a size from that.
                  </p>
                  <p className="mt-2">
                    The reading came out at {result.lengthMm} mm but with only{" "}
                    {(result.confidence * 100).toFixed(0)}% confidence — close enough to a
                    size boundary that we&apos;d be guessing. Rather than send you the wrong
                    shoe: retake it following the checklist below, use the precise
                    tap mode, or enter your own measurement.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Foot length" value={`${result.lengthMm} mm ±${result.toleranceMm}`} />
                <Fact
                  label="Foot width"
                  value={`${result.widthMm} mm${result.widthEstimated ? " (typical)" : ""}`}
                />
                <Fact label="Width fit" value={result.sizes.widthCategory} />
                <Fact label="Arch type" value={result.archType} />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {result.sizes.recommendation}
              </div>

              {/* Where the number came from — always visible, never buried. */}
              <div
                className={`rounded-xl p-3 text-xs ring-1 ${
                  result.source === "ai"
                    ? "bg-amber-50 text-amber-900 ring-amber-200"
                    : "bg-emerald-50 text-emerald-900 ring-emerald-200"
                }`}
              >
                {result.source === "ai" ? (
                  <>
                    <strong>AI estimate from one photo — it can be wrong.</strong>{" "}
                    Confidence {(result.confidence * 100).toFixed(0)}%. A single photo has no
                    depth information, so camera angle alone can shift this by several
                    millimetres. Please sanity-check it against a shoe that already fits
                    you.
                  </>
                ) : result.source === "measured" ? (
                  <>
                    <strong>Measured, not guessed.</strong> Calculated from the sheet
                    corners you tapped, which cancels out camera tilt.
                  </>
                ) : (
                  <>
                    <strong>Your own measurement.</strong> This is the number we trust most.
                  </>
                )}
              </div>

              {result.note && <p className="text-xs text-slate-500">{result.note}</p>}

              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={saveProfile} className="btn-primary">
                  {saved ? (<><CheckCircle2 size={16} /> Saved</>) : "Save to my profile"}
                </button>
                <Link
                  href={`/search?q=${encodeURIComponent(
                    `${audience === "kids" ? "kids" : audience} shoes UK size ${result.sizes.uk}` +
                      (result.sizes.widthCategory === "wide" ? " wide fit" : "")
                  )}`}
                  className="btn-ghost justify-center"
                >
                  <Search size={15} /> Find shoes in this size
                </Link>
              </div>

              <button
                onClick={() => { setMode("manual"); setResult(null); setManualMm(String(result.lengthMm)); }}
                className="w-full text-center text-xs font-semibold text-brand-600 hover:underline"
              >
                Not right? Enter your own measurement instead →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- guidance ---------------- */}
      <div className="mx-auto mt-10 max-w-4xl card p-6">
        <h2 className="text-lg font-bold text-slate-900">
          How to get an accurate reading
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Follow these and the estimate is right far more often — and comes back with
          higher confidence.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {GUIDANCE.map((g, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-black text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-snug text-slate-700">{g}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-700">One more thing worth knowing:</strong> even a
          perfect measurement doesn&apos;t guarantee fit, because the same UK 9 differs
          between brands — each uses its own last. That&apos;s why we show what real
          buyers said about a brand&apos;s sizing on every{" "}
          <Link href="/brands" className="font-semibold text-brand-600 hover:underline">
            brand page
          </Link>
          , and why your own measurement plus that feedback beats any size chart.
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold capitalize text-slate-900">{value}</p>
    </div>
  );
}
