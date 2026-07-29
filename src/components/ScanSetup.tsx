/**
 * What a usable photo looks like.
 *
 * Written as a diagram rather than a paragraph because the instruction that
 * actually matters — sheet flat, heel on the near edge, camera straight above,
 * whole sheet in frame — is spatial, and the person who could not finish the old
 * flow had read the paragraph. Inline SVG, so it costs nothing to load and scales
 * with the card.
 */
export function ScanSetup() {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Set it up like this
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {/* side view: camera above, foot on sheet */}
        <figure>
          <svg viewBox="0 0 200 130" className="w-full" role="img"
               aria-label="Side view: phone held level directly above a foot standing on a sheet of paper">
            {/* floor */}
            <line x1="10" y1="112" x2="190" y2="112" className="stroke-slate-300" strokeWidth="2" />
            {/* sheet */}
            <rect x="52" y="104" width="96" height="8" rx="1" className="fill-white stroke-slate-400" strokeWidth="1.5" />
            {/* foot */}
            <path d="M74 104 C74 92 78 84 86 82 C96 79 104 84 112 90 C120 96 124 100 124 104 Z"
                  className="fill-slate-300 stroke-slate-500" strokeWidth="1.5" />
            {/* leg */}
            <rect x="78" y="52" width="14" height="32" rx="5" className="fill-slate-200 stroke-slate-400" strokeWidth="1.5" />
            {/* phone, level */}
            <rect x="76" y="16" width="48" height="24" rx="4" className="fill-slate-800" />
            <rect x="80" y="20" width="40" height="16" rx="2" className="fill-brand-300" />
            {/* level indicator */}
            <line x1="66" y1="28" x2="76" y2="28" className="stroke-emerald-500" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="124" y1="28" x2="134" y2="28" className="stroke-emerald-500" strokeWidth="2" strokeDasharray="3 2" />
            {/* sight lines */}
            <line x1="84" y1="40" x2="60" y2="102" className="stroke-brand-300" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="116" y1="40" x2="140" y2="102" className="stroke-brand-300" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
          <figcaption className="mt-1 text-xs text-slate-600">
            Stand on the sheet. Hold the phone <strong>level, straight above</strong> —
            the shutter stays locked until it is.
          </figcaption>
        </figure>

        {/* top view: what should be in frame */}
        <figure>
          <svg viewBox="0 0 200 130" className="w-full" role="img"
               aria-label="Top view: the whole sheet and the whole foot inside the frame, heel on the near edge">
            {/* frame */}
            <rect x="8" y="8" width="184" height="114" rx="4"
                  className="fill-none stroke-slate-300" strokeWidth="2" strokeDasharray="6 4" />
            {/* sheet, slightly rotated to make the point that it need not be square on */}
            <g transform="rotate(-6 100 65)">
              <rect x="58" y="18" width="84" height="94" rx="2"
                    className="fill-white stroke-slate-500" strokeWidth="2" />
              {/* corner markers, matching the ones in the measuring step */}
              {[[58, 18, "1"], [142, 18, "2"], [142, 112, "3"], [58, 112, "4"]].map(([cx, cy, n]) => (
                <g key={String(n)}>
                  <circle cx={cx as number} cy={cy as number} r="7" className="fill-brand-600" />
                  <text x={cx as number} y={(cy as number) + 3} textAnchor="middle"
                        className="fill-white text-[8px] font-bold">{n}</text>
                </g>
              ))}
              {/* foot */}
              <path d="M84 104 C82 84 84 62 90 48 C95 36 106 32 112 42 C118 52 116 76 114 92 C113 100 112 104 110 104 Z"
                    className="fill-slate-200 stroke-slate-500" strokeWidth="1.5" />
              {/* heel + toe markers */}
              <circle cx="97" cy="102" r="7" className="fill-emerald-600" />
              <text x="97" y="105" textAnchor="middle" className="fill-white text-[8px] font-bold">H</text>
              <circle cx="106" cy="36" r="7" className="fill-emerald-600" />
              <text x="106" y="39" textAnchor="middle" className="fill-white text-[8px] font-bold">T</text>
            </g>
          </svg>
          <figcaption className="mt-1 text-xs text-slate-600">
            Get the <strong>whole sheet and whole foot</strong> in frame. The sheet
            does not have to be straight — you will drag these same markers onto it.
          </figcaption>
        </figure>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Bare foot or a thin sock, standing, on hard floor rather than carpet. Even
        light, no shadow across the toes.
      </p>
    </div>
  );
}
