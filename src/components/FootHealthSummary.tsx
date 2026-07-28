"use client";

import Link from "next/link";
import { AlertTriangle, Stethoscope, Footprints, Info, ArrowRight } from "lucide-react";
import { MEDICAL_DISCLAIMER } from "@/lib/footHealth";

type RedFlag = { title: string; detail: string; action: string };
type Observation = {
  title: string;
  because: string;
  footwear: string[];
  seeSomeoneIf?: string;
};
export type Screening = {
  urgent: boolean;
  redFlags: RedFlag[];
  observations: Observation[];
  summary: {
    daysLogged: number;
    totalKm: number;
    totalSteps: number;
    painDays: number;
    painAreas: string[];
    weeklyKm: number;
  };
  needs: string[];
  insufficientData: boolean;
};

/**
 * Renders the screening.
 *
 * When a red flag is present the footwear guidance is deliberately NOT shown.
 * Offering a shoe recommendation alongside "you reported a wound that isn't
 * healing" would bury the one thing that matters, and a shopper could reasonably
 * read it as reassurance. Referral first, and on its own.
 */
export function FootHealthSummary({
  screening,
  hasFootProfile
}: {
  screening: Screening;
  hasFootProfile: boolean;
}) {
  const s = screening;

  if (s.insufficientData) {
    return (
      <div className="card p-5">
        <p className="flex items-center gap-2 font-bold text-slate-900">
          <Footprints size={16} className="text-brand-600" /> Your foot health summary
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Nothing to summarise yet. Two things fill this in:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/foot-scan" className="btn-ghost">Measure your feet</Link>
          <span className="self-center text-xs text-slate-400">and log a day below</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* red flags own the top of the page and suppress product advice */}
      {s.urgent && (
        <div className="rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200">
          <p className="flex items-center gap-2 text-base font-black text-rose-900">
            <AlertTriangle size={18} /> Please see a clinician about this
          </p>
          <p className="mt-2 text-sm text-rose-900">
            You&apos;ve reported something that isn&apos;t a footwear problem. We&apos;re holding
            back the shoe guidance on purpose — it isn&apos;t the answer here.
          </p>
          <ul className="mt-4 space-y-4">
            {s.redFlags.map((f) => (
              <li key={f.title} className="rounded-xl bg-white p-4 ring-1 ring-rose-100">
                <p className="font-bold text-slate-900">{f.title}</p>
                <p className="mt-1 text-sm text-slate-600">{f.detail}</p>
                <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-rose-700">
                  <Stethoscope size={15} className="mt-0.5 shrink-0" /> {f.action}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-rose-800">
            If you have diabetes, ask specifically for a foot examination — reduced
            sensation means damage can go unnoticed.
          </p>
        </div>
      )}

      {/* what the data shows */}
      <div className="card p-5">
        <p className="flex items-center gap-2 font-bold text-slate-900">
          <Footprints size={16} className="text-brand-600" /> What your log shows
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Days logged" value={String(s.summary.daysLogged)} />
          <Stat label="Distance" value={`${s.summary.totalKm} km`} />
          <Stat label="Steps" value={s.summary.totalSteps.toLocaleString("en-IN")} />
          <Stat
            label="Days with pain"
            value={String(s.summary.painDays)}
            warn={s.summary.painDays >= 4}
          />
        </dl>
        {s.summary.weeklyKm > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            That&apos;s about {s.summary.weeklyKm} km a week at your current logging rate.
          </p>
        )}
        {!hasFootProfile && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Arch and width observations need a measurement.{" "}
              <Link href="/foot-scan" className="font-semibold text-brand-600 hover:underline">
                Scan your feet
              </Link>{" "}
              to unlock them.
            </span>
          </p>
        )}
      </div>

      {/* observations — withheld when a red flag is present */}
      {!s.urgent && s.observations.length > 0 && (
        <div className="card p-5">
          <p className="font-bold text-slate-900">What tends to help</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Footwear features commonly associated with comfort for this pattern. Not a
            diagnosis and not a treatment.
          </p>
          <ul className="mt-4 space-y-4">
            {s.observations.map((o) => (
              <li key={o.title} className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{o.title}</p>
                <p className="mt-1 text-xs text-slate-500">{o.because}</p>
                {o.footwear.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {o.footwear.map((f) => (
                      <li key={f} className="text-sm text-slate-700">· {f}</li>
                    ))}
                  </ul>
                )}
                {o.seeSomeoneIf && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-800">
                    <Stethoscope size={14} className="mt-0.5 shrink-0" />
                    <span>See a doctor or podiatrist if {o.seeSomeoneIf}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>

          {s.needs.length > 0 && (
            <Link
              href={`/search?q=${encodeURIComponent(
                "shoes with " + s.needs.map((n) => n.replace(/-/g, " ")).join(" and ")
              )}`}
              className="btn-primary mt-4 w-full justify-center"
            >
              Find shoes with these features <ArrowRight size={15} />
            </Link>
          )}
        </div>
      )}

      <p className="rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-700">Important.</strong> {MEDICAL_DISCLAIMER}
      </p>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${warn ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-black ${warn ? "text-amber-900" : "text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}
