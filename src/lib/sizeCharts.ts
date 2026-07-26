/**
 * Brand size charts, and the cross-brand comparison built on top of them.
 *
 * WHAT THIS IS AND ISN'T
 *
 * A size chart maps a foot length in millimetres to that brand's label. This is
 * the only honest way to compare brands, because "UK 9" is not a measurement —
 * it's a label each brand prints on its own last. Comparing labels to labels is
 * meaningless; comparing both back to millimetres is not.
 *
 * The `charts` below are the standard published mappings for each sizing system
 * a brand uses (UK-barleycorn, EU Paris-point, US, or Japanese/Mondopoint cm),
 * derived from foot length exactly like lib/fit.ts does. They are a faithful
 * conversion, NOT scraped from each brand's own PDF.
 *
 * That distinction matters and is surfaced in the UI: a real brand chart can
 * differ from the standard by a half size, and some brands' charts disagree with
 * their own shoes. So the comparison shows two things side by side — the
 * standard conversion, and what real buyers said about that brand's fit
 * (lib/brandFit.ts). Where they disagree, the buyers are usually right.
 *
 * Replacing `source: "standard"` with `source: "official"` per brand, as their
 * published charts are collected, needs no other change.
 */

import type { Audience } from "@/lib/fit";

export type SizeSystem = "uk" | "eu" | "us" | "cm";

export type BrandChart = {
  brand: string;
  /** The label the brand actually prints on the box in India. */
  primary: SizeSystem;
  /** Also printed, for shoppers cross-checking. */
  secondary: SizeSystem[];
  /**
   * standard   — faithful conversion from foot length (what we have today)
   * official   — transcribed from the brand's own published chart
   */
  source: "standard" | "official";
  /**
   * Half-size bias vs the standard conversion, in size steps, when the brand is
   * known to run differently. 0 unless there's evidence.
   */
  bias: number;
  note?: string;
};

/**
 * Which label each brand leads with in the Indian market. Getting this right
 * matters more than it sounds: buying a "9" from Nike (US) when you measured
 * UK 9 is a two-size mistake.
 */
export const BRAND_CHARTS: Record<string, BrandChart> = {
  Nike: { brand: "Nike", primary: "uk", secondary: ["eu", "us", "cm"], source: "standard", bias: 0,
    note: "Nike boxes in India show UK/EU/US together; running lasts are on the narrow side." },
  Adidas: { brand: "Adidas", primary: "uk", secondary: ["eu", "us"], source: "standard", bias: 0 },
  Puma: { brand: "Puma", primary: "uk", secondary: ["eu", "us"], source: "standard", bias: 0 },
  Asics: { brand: "Asics", primary: "uk", secondary: ["eu", "us", "cm"], source: "standard", bias: 0,
    note: "Asics also prints Japanese cm, which is the foot length — the most useful number on the box." },
  "New Balance": { brand: "New Balance", primary: "uk", secondary: ["eu", "us"], source: "standard", bias: 0,
    note: "One of the few brands offering width variants (2E/4E) in India." },
  Skechers: { brand: "Skechers", primary: "uk", secondary: ["eu", "us"], source: "standard", bias: 0 },
  Crocs: { brand: "Crocs", primary: "uk", secondary: ["eu"], source: "standard", bias: 0,
    note: "Crocs uses paired sizes (M8/W10 etc.) and fits roomy by design." },
  Birkenstock: { brand: "Birkenstock", primary: "eu", secondary: ["uk"], source: "standard", bias: 0,
    note: "EU only, in whole sizes — there is no half size, so round to the nearest and check the width (regular vs narrow)." },
  Clarks: { brand: "Clarks", primary: "uk", secondary: ["eu"], source: "standard", bias: 0,
    note: "Clarks publishes width fittings (G/H); UK sizing is their native scale." },
  Woodland: { brand: "Woodland", primary: "uk", secondary: ["eu"], source: "standard", bias: 0,
    note: "Boots are roomy for thick socks — many buyers take their measured size, not a size up." },
  Bata: { brand: "Bata", primary: "uk", secondary: ["eu"], source: "standard", bias: 0 },
  Metro: { brand: "Metro", primary: "uk", secondary: ["eu"], source: "standard", bias: 0 },
  Campus: { brand: "Campus", primary: "uk", secondary: ["eu"], source: "standard", bias: 0 },
  "Dr. Scholl's": { brand: "Dr. Scholl's", primary: "uk", secondary: ["eu"], source: "standard", bias: 0 },
};

export function chartFor(brand: string): BrandChart {
  return (
    BRAND_CHARTS[brand] ?? {
      brand,
      primary: "uk",
      secondary: ["eu"],
      source: "standard",
      bias: 0
    }
  );
}

const ADULT_ALLOWANCE_MM = 17;
const KIDS_ALLOWANCE_MM = 14;
const KIDS_MAX_FOOT_MM = 205;

const halfStep = (n: number) => Math.round(n * 2) / 2;

/**
 * Label a brand would print for this foot length. Same allowances and constants
 * as lib/fit.ts on purpose — two different conversions of the same measurement
 * would be a bug waiting to happen.
 */
export function labelFor(
  footMm: number,
  system: SizeSystem,
  audience: Audience,
  bias = 0
): number {
  const child = audience === "kids" || footMm < KIDS_MAX_FOOT_MM;
  const lastMm = footMm + (child ? KIDS_ALLOWANCE_MM : ADULT_ALLOWANCE_MM);
  const lastInches = lastMm / 25.4;

  switch (system) {
    case "cm":
      // Mondopoint / Japanese: the foot length itself, to the nearest half cm.
      return Math.round((footMm / 10) * 2) / 2;
    case "eu":
      return halfStep(lastMm / 6.667 + bias);
    case "us": {
      const uk = 3 * lastInches - (child ? 12 : 25);
      const offset = child ? 1 : audience === "women" ? 2 : 1;
      return halfStep(uk + offset + bias);
    }
    case "uk":
    default:
      return Math.max(child ? 0.5 : 1, halfStep(3 * lastInches - (child ? 12 : 25) + bias));
  }
}

export const SYSTEM_LABEL: Record<SizeSystem, string> = {
  uk: "UK",
  eu: "EU",
  us: "US",
  cm: "cm (foot length)"
};

/** One row of the brand's own chart. */
export type ChartRow = { footMm: number; labels: Partial<Record<SizeSystem, number>> };

export function buildChart(
  brand: string,
  audience: Audience,
  from?: number,
  to?: number
): { chart: BrandChart; systems: SizeSystem[]; rows: ChartRow[] } {
  const chart = chartFor(brand);
  const systems: SizeSystem[] = [chart.primary, ...chart.secondary];

  const kids = audience === "kids";
  const start = from ?? (kids ? 120 : 220);
  const end = to ?? (kids ? 205 : 300);

  const rows: ChartRow[] = [];
  // 5 mm steps: finer than a half size (4.23 mm) would imply false precision,
  // coarser would skip sizes.
  for (let mm = start; mm <= end; mm += 5) {
    const labels: Partial<Record<SizeSystem, number>> = {};
    for (const s of systems) labels[s] = labelFor(mm, s, audience, chart.bias);
    rows.push({ footMm: mm, labels });
  }
  return { chart, systems, rows };
}

export type BrandComparisonRow = {
  brand: string;
  primary: SizeSystem;
  label: number;
  /** Label including the brand's fit bias from real buyers, if any. */
  adjustedLabel: number | null;
  fitVerdict: "small" | "true-to-size" | "large" | null;
  reviews: number;
  note?: string;
  source: BrandChart["source"];
};

/**
 * "Your foot is 267 mm — here's what each brand calls that."
 *
 * Takes the buyer-sourced sizing verdicts so the table can show both the chart
 * label and the practical adjustment, which is the part shoppers actually need.
 */
export function compareBrands(
  footMm: number,
  audience: Audience,
  brands: string[],
  verdicts: Record<string, { verdict: "small" | "true-to-size" | "large"; reviews: number }> = {}
): BrandComparisonRow[] {
  return brands
    .map((brand) => {
      const chart = chartFor(brand);
      const label = labelFor(footMm, chart.primary, audience, chart.bias);
      const v = verdicts[brand];
      // "Runs small" means take a bigger label; "runs large" means smaller.
      const step = !v ? 0 : v.verdict === "small" ? 0.5 : v.verdict === "large" ? -0.5 : 0;
      return {
        brand,
        primary: chart.primary,
        label,
        adjustedLabel: step === 0 ? null : Math.round((label + step) * 2) / 2,
        fitVerdict: v?.verdict ?? null,
        reviews: v?.reviews ?? 0,
        note: chart.note,
        source: chart.source
      };
    })
    .sort((a, b) => a.brand.localeCompare(b.brand));
}
