"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  measureMm,
  cornersLookSane,
  REFERENCES,
  type Pt,
  type ReferenceKey
} from "@/lib/homography";
import { RotateCcw, Check, Move } from "lucide-react";
import { isPlausibleFoot } from "@/lib/fit";

/**
 * Measure a foot on a photo, by dragging six markers.
 *
 * WHY IT IS NOT A TAP SEQUENCE ANY MORE
 *
 * The first version asked for six taps in a fixed order — "tap the top-left
 * corner of the sheet", then the next, then the next. It tested badly for the
 * obvious reason: on a photo of a sheet lying at an angle there is no agreed
 * top-left, nothing on screen shows where the tap is meant to go, a fingertip
 * covers the corner it is aiming at, and you learn whether any of it worked only
 * after the sixth tap. The person testing it could not finish, and said so.
 *
 * So every marker starts on screen, already labelled, and is dragged into place in
 * any order. Three things follow from that, and they are the whole improvement:
 * the sheet outline and the measuring line are visible the entire time, the
 * millimetre reading updates as you drag so a mistake is obvious immediately, and
 * a magnifier shows what is under your finger instead of your finger.
 *
 * The maths is unchanged: four corners of a known rectangle give the plane's
 * homography, which cancels perspective, and heel-to-toe is then read in real
 * millimetres.
 */

type Marker = { key: string; label: string; hint: string; kind: "corner" | "foot" };

const MARKERS: Marker[] = [
  { key: "c1", label: "1", hint: "a corner of the sheet", kind: "corner" },
  { key: "c2", label: "2", hint: "the next corner, going around", kind: "corner" },
  { key: "c3", label: "3", hint: "the opposite corner", kind: "corner" },
  { key: "c4", label: "4", hint: "the last corner", kind: "corner" },
  { key: "heel", label: "H", hint: "the back of your heel", kind: "foot" },
  { key: "toe", label: "T", hint: "the tip of your longest toe", kind: "foot" }
];

/** Starting layout: corners inset from the frame, foot markers down the middle. */
function initialPoints(w: number, h: number): Pt[] {
  const ix = w * 0.16;
  const iy = h * 0.16;
  return [
    { x: ix, y: iy },
    { x: w - ix, y: iy },
    { x: w - ix, y: h - iy },
    { x: ix, y: h - iy },
    { x: w / 2, y: h * 0.72 },
    { x: w / 2, y: h * 0.3 }
  ];
}

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
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setPts([]);
    setNatural(null);
    setTouched(false);
  }, [imageDataUrl]);

  // Live reading. Recomputed on every drag frame, which is what makes a
  // misplaced corner obvious while you can still fix it.
  const reading = useMemo(() => {
    if (pts.length !== 6) return { mm: null as number | null, problem: "" };
    const corners = pts.slice(0, 4);
    const problem = cornersLookSane(corners, reference) || "";
    const mm = measureMm(corners, reference, pts[4], pts[5]);
    return { mm: mm && Number.isFinite(mm) ? Math.round(mm) : null, problem };
  }, [pts, reference]);

  const usable = reading.mm !== null && !reading.problem && isPlausibleFoot(reading.mm);

  const toImage = useCallback(
    (clientX: number, clientY: number): Pt | null => {
      if (!imgRef.current || !natural) return null;
      const r = imgRef.current.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * natural.w;
      const y = ((clientY - r.top) / r.height) * natural.h;
      return {
        x: Math.min(natural.w, Math.max(0, x)),
        y: Math.min(natural.h, Math.max(0, y))
      };
    },
    [natural]
  );

  // Dragging is wired to the window rather than the marker so the pointer can
  // leave the small hit area mid-drag without the marker being dropped.
  useEffect(() => {
    if (dragging === null) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      const p = toImage(e.clientX, e.clientY);
      if (!p) return;
      setPts((prev) => prev.map((q, i) => (i === dragging ? p : q)));
      setTouched(true);
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, toImage]);

  // Tapping the photo moves the nearest marker there. Faster than dragging across
  // the frame, and it means a stray tap can never add a seventh point.
  function tapToNearest(e: React.PointerEvent) {
    if (dragging !== null || pts.length !== 6) return;
    const p = toImage(e.clientX, e.clientY);
    if (!p) return;
    let best = 0;
    let bestD = Infinity;
    pts.forEach((q, i) => {
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setPts((prev) => prev.map((q, i) => (i === best ? p : q)));
    setTouched(true);
  }

  const pct = (p: Pt) =>
    natural ? { left: `${(p.x / natural.w) * 100}%`, top: `${(p.y / natural.h) * 100}%` } : {};

  const ref = REFERENCES[reference];
  const active = dragging !== null ? pts[dragging] : null;

  return (
    <div>
      <div className="mb-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
        <p className="flex items-start gap-2">
          <Move size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Drag the markers.</strong> Put the four
            blue ones on the {ref.label.toLowerCase()}&apos;s corners — any order, just
            go around rather than crossing over. Then <strong>H</strong> on the back of
            your heel and <strong>T</strong> on your longest toe. Tapping the photo
            moves whichever marker is nearest.
          </span>
        </p>
      </div>

      {/* The live reading. This is the part that was missing: you can see whether
          the markers are right before committing to anything. */}
      <div
        className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 ring-1 ${
          usable
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : touched
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-slate-50 text-slate-600 ring-slate-200"
        }`}
      >
        <span className="text-sm">
          {usable ? "Foot length" : touched ? "Not measurable yet" : "Rough starting positions"}
        </span>
        <span className="text-xl font-black">
          {reading.mm !== null ? `${reading.mm} mm` : "—"}
        </span>
      </div>

      {reading.problem && touched && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          {reading.problem}
        </p>
      )}
      {!reading.problem && reading.mm !== null && !isPlausibleFoot(reading.mm) && touched && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          {reading.mm} mm is not a plausible foot — the four blue markers are probably
          not on the {ref.label.toLowerCase()}&apos;s corners.
        </p>
      )}

      <div className="relative select-none overflow-hidden rounded-xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageDataUrl}
          alt="Your foot photo, with draggable measurement markers"
          className="w-full touch-none"
          draggable={false}
          onPointerDown={tapToNearest}
          onLoad={(e) => {
            const el = e.target as HTMLImageElement;
            setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            setPts(initialPoints(el.naturalWidth, el.naturalHeight));
          }}
        />

        {natural && pts.length === 6 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${natural.w} ${natural.h}`}
            preserveAspectRatio="none"
          >
            <polygon
              points={pts.slice(0, 4).map((p) => `${p.x},${p.y}`).join(" ")}
              className={
                reading.problem
                  ? "fill-amber-400/10 stroke-amber-400"
                  : "fill-brand-400/15 stroke-brand-400"
              }
              strokeWidth={Math.max(2, natural.w / 350)}
            />
            <line
              x1={pts[4].x}
              y1={pts[4].y}
              x2={pts[5].x}
              y2={pts[5].y}
              className={usable ? "stroke-emerald-400" : "stroke-slate-300"}
              strokeWidth={Math.max(2, natural.w / 350)}
              strokeDasharray={`${natural.w / 55} ${natural.w / 80}`}
            />
          </svg>
        )}

        {pts.map((p, i) => {
          const m = MARKERS[i];
          return (
            <button
              key={m.key}
              type="button"
              aria-label={`Marker ${m.label} — ${m.hint}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDragging(i);
              }}
              style={pct(p)}
              // Generous hit area, small visible dot: a 44px target is reachable
              // with a thumb, an 8px one is not.
              className="absolute -ml-5 -mt-5 grid h-10 w-10 touch-none place-items-center rounded-full"
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black text-white shadow-md ring-2 ring-white transition ${
                  m.kind === "corner" ? "bg-brand-600" : "bg-emerald-600"
                } ${dragging === i ? "scale-125" : ""}`}
              >
                {m.label}
              </span>
            </button>
          );
        })}

        {/* Magnifier. Without it you are aiming a fingertip at the very thing the
            fingertip is covering. */}
        {active && natural && (
          <div
            className="pointer-events-none absolute h-24 w-24 overflow-hidden rounded-full ring-2 ring-white shadow-xl"
            style={{
              left: `calc(${(active.x / natural.w) * 100}% - 48px)`,
              top: `calc(${(active.y / natural.h) * 100}% - 124px)`,
              backgroundImage: `url(${imageDataUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${natural.w * 0.75}px ${natural.h * 0.75}px`,
              backgroundPosition: `${48 - active.x * 0.75}px ${48 - active.y * 0.75}px`
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-rose-500" />
            <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-rose-500" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (natural) setPts(initialPoints(natural.w, natural.h));
            setTouched(false);
          }}
          className="btn-ghost"
        >
          <RotateCcw size={15} /> Reset markers
        </button>
        <button onClick={onCancel} className="btn-ghost">
          Retake photo
        </button>
        <button
          onClick={() => reading.mm !== null && onMeasured({ lengthMm: reading.mm, widthMm: null })}
          disabled={!usable}
          className="btn-primary ml-auto"
        >
          <Check size={15} /> Use {usable ? `${reading.mm} mm` : "this measurement"}
        </button>
      </div>
    </div>
  );
}
