"use client";

import { TILT_LIMIT_DEG, type TiltState } from "@/lib/useDeviceTilt";
import { Check, AlertTriangle, Smartphone } from "lucide-react";

/**
 * Live spirit level over the camera preview.
 *
 * A bubble the user can watch is far more effective than an instruction they've
 * already scrolled past — and it makes the reason for a blocked shutter obvious
 * instead of feeling broken.
 */
export function LevelIndicator({ tilt }: { tilt: TiltState }) {
  if (tilt.needsPermission) {
    return (
      <button
        onClick={tilt.request}
        className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur"
      >
        <Smartphone size={14} /> Tap to enable the level guide
      </button>
    );
  }

  if (!tilt.supported || tilt.offLevel === null) return null;

  const off = tilt.offLevel;
  const level = off <= TILT_LIMIT_DEG;
  // Clamp the bubble to the track so a big tilt doesn't push it out of view.
  const shift = Math.max(-45, Math.min(45, (tilt.gamma ?? 0) * 1.6));
  const rise = Math.max(-45, Math.min(45, (tilt.beta ?? 0) * 1.6));

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* crosshair + bubble */}
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`absolute inset-0 rounded-full border-2 ${
            level ? "border-emerald-400/80" : "border-white/50"
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-100 ${
            level ? "bg-emerald-400" : "bg-amber-400"
          }`}
          style={{ transform: `translate(calc(-50% + ${shift}px), calc(-50% + ${rise}px))` }}
        />
      </div>

      <div
        className={`absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold shadow-lg backdrop-blur ${
          level ? "bg-emerald-500/95 text-white" : "bg-amber-500/95 text-white"
        }`}
      >
        {level ? (
          <><Check size={14} /> Level — go ahead</>
        ) : (
          <><AlertTriangle size={14} /> {Math.round(off)}° off level — hold the phone flat</>
        )}
      </div>
    </div>
  );
}
