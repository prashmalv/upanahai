import { Mic, ScanLine, IndianRupee, HeartPulse, ArrowDown, Check } from "lucide-react";

/**
 * Four capability tiles for the homepage.
 *
 * Each shows a miniature of the product's real output instead of describing it
 * in a paragraph — parsed intent chips, a size readout, a price ladder, a
 * support meter. All CSS/SVG: nothing to download, no screenshot to go stale.
 *
 * Every tile ends with a one-line footnote and the body uses justify-between, so
 * the four cards bottom-align instead of leaving ragged empty space when the
 * grid row stretches to the tallest one.
 */

function Tile({
  icon: Icon,
  title,
  note,
  children
}: {
  icon: typeof Mic;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-100 shadow-soft transition hover:-translate-y-1 hover:ring-indigo-100">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
          <Icon size={17} />
        </span>
        <h3 className="font-bold leading-tight text-slate-900">{title}</h3>
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-between">
        <div>{children}</div>
        <p className="mt-4 text-[11px] leading-snug text-slate-400">{note}</p>
      </div>
    </div>
  );
}

const chip =
  "rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700";

// Bar length is proportional to price, so the shortest bar is the cheapest —
// the opposite mapping would read as "longer = better value".
const OFFERS = [
  { r: "Flipkart", p: 3499, best: true },
  { r: "Myntra", p: 3750, best: false },
  { r: "Amazon.in", p: 3995, best: false }
];
const MAX_PRICE = Math.max(...OFFERS.map((o) => o.p));

export function CapabilityTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* 1 — natural language becomes structured intent */}
      <Tile
        icon={Mic}
        title="Understands need, not keywords"
        note="Parsed into real filters — not a text match on “walking”."
      >
        <div className="rounded-xl bg-slate-50 p-3 text-[13px] leading-snug text-slate-600 ring-1 ring-slate-100">
          “comfortable walking shoes for my grandfather under ₹5000”
        </div>
        <ArrowDown size={14} className="mx-auto my-2 text-slate-300" />
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>Men</span>
          <span className={chip}>Walking</span>
          <span className={chip}>≤ ₹5,000</span>
          <span className={chip}>Senior</span>
          <span className={chip}>Arch support</span>
        </div>
      </Tile>

      {/* 2 — foot scan → real sizes */}
      <Tile
        icon={ScanLine}
        title="Knows your actual foot"
        note="A bank card in frame gives the scale. No measuring tape needed."
      >
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <svg
            viewBox="0 0 200 62"
            className="h-[68px] w-full"
            role="img"
            aria-label="Foot length measured against a bank card used for scale"
          >
            {/* reference card */}
            <rect x="3" y="20" width="42" height="26" rx="3.5"
                  className="fill-white stroke-slate-300" strokeWidth="1.5" />
            <line x1="8" y1="27" x2="24" y2="27" className="stroke-slate-200" strokeWidth="3" />
            <text x="24" y="42" textAnchor="middle" className="fill-slate-400" fontSize="6.5">
              85.6 mm
            </text>

            {/* ruler baseline with ticks */}
            <line x1="58" y1="46" x2="192" y2="46" className="stroke-slate-300" strokeWidth="1" />
            {Array.from({ length: 14 }).map((_, i) => (
              <line
                key={i}
                x1={58 + i * 10.3}
                y1={46}
                x2={58 + i * 10.3}
                y2={i % 5 === 0 ? 40 : 43}
                className="stroke-slate-300"
                strokeWidth="1"
              />
            ))}

            {/* measured span */}
            <line x1="58" y1="16" x2="192" y2="16" className="stroke-indigo-500" strokeWidth="1.5" />
            <line x1="58" y1="11" x2="58" y2="21" className="stroke-indigo-500" strokeWidth="1.5" />
            <line x1="192" y1="11" x2="192" y2="21" className="stroke-indigo-500" strokeWidth="1.5" />
            <rect x="102" y="9" width="46" height="14" rx="7" className="fill-indigo-600" />
            <text x="125" y="19" textAnchor="middle" className="fill-white" fontSize="8" fontWeight="700">
              267 mm
            </text>
            {/* No width annotation here on purpose — it collided with the ruler
                ticks, and the width is already reported as "D width" below. */}
          </svg>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div>
            <p className="text-2xl font-black leading-none text-slate-900">UK 9</p>
            <p className="mt-1 text-[11px] text-slate-500">EU 43 · US 10</p>
          </div>
          <div className="ml-auto text-right text-[11px] text-slate-500">
            <p>D width</p>
            <p>Normal arch</p>
          </div>
        </div>
      </Tile>

      {/* 3 — price ladder across retailers */}
      <Tile
        icon={IndianRupee}
        title="On your side, not the seller's"
        note="We earn nothing by sending you to a costlier store."
      >
        <ul className="space-y-2.5">
          {OFFERS.map((o) => (
            <li key={o.r}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className={o.best ? "font-bold text-slate-900" : "text-slate-600"}>
                  {o.r}
                </span>
                <span className="flex items-center gap-1.5">
                  {o.best && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                      <Check size={8} /> Lowest
                    </span>
                  )}
                  <span
                    className={
                      o.best
                        ? "font-black tabular-nums text-slate-900"
                        : "tabular-nums text-slate-500"
                    }
                  >
                    ₹{o.p.toLocaleString("en-IN")}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${o.best ? "bg-emerald-500" : "bg-slate-300"}`}
                  style={{ width: `${(o.p / MAX_PRICE) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">
          Same shoe · <span className="font-semibold text-emerald-700">₹496 saved</span> by
          checking all three.
        </p>
      </Tile>

      {/* 4 — activity shapes the recommendation */}
      <Tile
        icon={HeartPulse}
        title="Cares how you walk"
        note="Recommendations shift toward what your body is asking for."
      >
        <div className="flex h-12 items-end gap-1.5">
          {[40, 62, 35, 80, 55, 92, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-indigo-500/70"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
          <span>Mon</span>
          <span>Sun</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          6.4 km this week ·{" "}
          <span className="font-semibold text-slate-700">heel discomfort logged</span>
        </p>
        <div className="mt-3 space-y-1.5">
          {[
            { label: "Arch support", v: 5 },
            { label: "Cushioning", v: 5 },
            { label: "Grip", v: 4 }
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <span className="w-[72px] shrink-0 text-[11px] text-slate-500">{m.label}</span>
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-4 rounded-full ${
                      i < m.v ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
      </Tile>
    </div>
  );
}
