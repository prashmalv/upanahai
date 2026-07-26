"use client";

import { useEffect, useRef, useState } from "react";
import {
  measureMm,
  cornersLookSane,
  REFERENCES,
  type Pt,
  type ReferenceKey
} from "@/lib/homography";
import { Undo2, RotateCcw, Check } from "lucide-react";

/**
 * Precise measurement mode: the user taps the four corners of the reference
 * sheet, then the back of the heel and the tip of the longest toe. Those six
 * taps are enough to solve the plane's homography and read the foot length in
 * real millimetres, with camera tilt cancelled out.
 *
 * Tapping beats automatic corner detection here: a person picks out a sheet's
 * corners on a patterned floor far more reliably than an edge detector, and the
 * result is deterministic — the same taps always give the same millimetres.
 */

const STEPS = [
  { key: "tl", label: "top-left corner of the sheet" },
  { key: "tr", label: "top-right corner" },
  { key: "br", label: "bottom-right corner" },
  { key: "bl", label: "bottom-left corner" },
  { key: "heel", label: "back of your heel" },
  { key: "toe", label: "tip of your longest toe" }
] as const;

export function FootMeasureCanvas({
  imageDataUrl,
  reference,
  onMeasured,
  onCancel
}: {
  imageDataUrl: string;
  reference: ReferenceKey;
  onMeasured: (mm: { lengthMm: number; widthMm: number | null }) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[pts.length];
  const done = pts.length === STEPS.length;

  useEffect(() => {
    setPts([]);
    setError(null);
  }, [imageDataUrl, reference]);

  function addPoint(e: React.MouseEvent | React.TouchEvent) {
    if (done || !imgRef.current || !natural) return;
    const rect = imgRef.current.getBoundingClientRect();
    const isTouch = "touches" in e;
    const cx = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Store in the image's own pixel space so the maths is independent of how
    // the photo happens to be scaled on screen.
    const x = ((cx - rect.left) / rect.width) * natural.w;
    const y = ((cy - rect.top) / rect.height) * natural.h;
    if (x < 0 || y < 0 || x > natural.w || y > natural.h) return;

    const next = [...pts, { x, y }];
    setError(null);

    if (next.length === 4) {
      const problem = cornersLookSane(next, reference);
      if (problem) {
        setError(problem);
        setPts(next.slice(0, 3)); // keep the first three, let them retry the 4th
        return;
      }
    }
    setPts(next);
  }

  function finish() {
    const corners = pts.slice(0, 4);
    const lengthMm = measureMm(corners, reference, pts[4], pts[5]);
    if (!lengthMm || !Number.isFinite(lengthMm)) {
      setError("Could not work out the geometry from those taps. Please start again.");
      return;
    }
    if (lengthMm < 90 || lengthMm > 360) {
      setError(
        `That works out to ${Math.round(lengthMm)} mm, which isn't a plausible foot. ` +
          "Check that the four corners were the sheet's corners."
      );
      return;
    }
    onMeasured({ lengthMm: Math.round(lengthMm), widthMm: null });
  }

  const ref = REFERENCES[reference];
  const scale = (p: Pt) =>
    natural ? { left: `${(p.x / natural.w) * 100}%`, top: `${(p.y / natural.h) * 100}%` } : {};

  return (
    <div>
      <div className="mb-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
        {done ? (
          <span className="font-semibold">All six points marked — tap “Use this measurement”.</span>
        ) : (
          <>
            <span className="font-semibold">Step {pts.length + 1} of 6:</span> tap the{" "}
            <span className="font-semibold">{step.label}</span>.
            {pts.length < 4 && (
              <span className="mt-1 block text-xs text-brand-800">
                Go around the {ref.label.toLowerCase()} in order — don&apos;t jump diagonally.
              </span>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div ref={wrapRef} className="relative overflow-hidden rounded-xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageDataUrl}
          alt="Your foot photo — tap to mark measurement points"
          className="w-full cursor-crosshair select-none"
          draggable={false}
          onLoad={(e) =>
            setNatural({
              w: (e.target as HTMLImageElement).naturalWidth,
              h: (e.target as HTMLImageElement).naturalHeight
            })
          }
          onClick={addPoint}
          onTouchStart={addPoint}
        />

        {/* sheet outline once the 4 corners are in */}
        {pts.length >= 4 && natural && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${natural.w} ${natural.h}`} preserveAspectRatio="none">
            <polygon
              points={pts.slice(0, 4).map((p) => `${p.x},${p.y}`).join(" ")}
              className="fill-brand-400/15 stroke-brand-400"
              strokeWidth={Math.max(2, natural.w / 400)}
            />
            {pts.length === 6 && (
              <line
                x1={pts[4].x} y1={pts[4].y} x2={pts[5].x} y2={pts[5].y}
                className="stroke-emerald-400"
                strokeWidth={Math.max(2, natural.w / 400)}
                strokeDasharray={`${natural.w / 60} ${natural.w / 90}`}
              />
            )}
          </svg>
        )}

        {pts.map((p, i) => (
          <span
            key={i}
            style={scale(p)}
            className={`pointer-events-none absolute -ml-3 -mt-3 grid h-6 w-6 place-items-center rounded-full text-[10px] font-black text-white ring-2 ring-white ${
              i < 4 ? "bg-brand-600" : "bg-emerald-600"
            }`}
          >
            {i < 4 ? i + 1 : i === 4 ? "H" : "T"}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => { setPts(pts.slice(0, -1)); setError(null); }}
          disabled={pts.length === 0}
          className="btn-ghost"
        >
          <Undo2 size={15} /> Undo
        </button>
        <button onClick={() => { setPts([]); setError(null); }} className="btn-ghost">
          <RotateCcw size={15} /> Start over
        </button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={finish} disabled={!done} className="btn-primary ml-auto">
          <Check size={15} /> Use this measurement
        </button>
      </div>
    </div>
  );
}
