import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { DISPLAYABLE } from "@/lib/products";
import { buildChart, compareBrands, SYSTEM_LABEL, type SizeSystem } from "@/lib/sizeCharts";
import { isPlausibleFoot, type Audience } from "@/lib/fit";
import { JsonLd } from "@/components/JsonLd";
import { SITE, breadcrumbJsonLd } from "@/lib/seo";
import { Ruler, Info, BadgeCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shoe Size Chart & Brand Size Comparison (UK / EU / US / cm)",
  description:
    "Convert your foot length in mm to UK, EU, US and cm shoe sizes, and see what the same foot measures across Nike, Adidas, Puma, Asics, Skechers, Bata, Campus, Clarks, Birkenstock and more — with real buyers' verdicts on whether each brand runs small or large.",
  keywords: [
    "shoe size chart India",
    "foot length to shoe size",
    "UK to EU shoe size conversion",
    "Nike vs Adidas size chart",
    "brand size comparison shoes",
    "mm to shoe size",
    "kids shoe size chart India"
  ],
  alternates: { canonical: "/size-chart" }
};

const AUDIENCES: Audience[] = ["men", "women", "kids"];

export default async function SizeChartPage({
  searchParams
}: {
  searchParams: { mm?: string; audience?: string; brand?: string };
}) {
  const audience: Audience = AUDIENCES.includes(searchParams.audience as Audience)
    ? (searchParams.audience as Audience)
    : "men";

  const [brandRows, verdictRows, session] = await Promise.all([
    prisma.product.groupBy({ by: ["brand"], where: DISPLAYABLE }),
    prisma.brandFeedback.findMany({ select: { brand: true, sizingAccuracy: true } }),
    getSession()
  ]);
  const brands = brandRows.map((b) => b.brand).sort();

  // Majority sizing verdict per brand, from the platform's own reviews.
  const verdicts: Record<string, { verdict: "small" | "true-to-size" | "large"; reviews: number }> = {};
  for (const brand of brands) {
    const own = verdictRows.filter((v) => v.brand === brand);
    if (!own.length) continue;
    const counts = own.reduce<Record<string, number>>((a, r) => {
      a[r.sizingAccuracy] = (a[r.sizingAccuracy] || 0) + 1;
      return a;
    }, {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) verdicts[brand] = { verdict: top as any, reviews: own.length };
  }

  // Foot length: from the URL, else the signed-in user's saved profile.
  const foot = session
    ? await prisma.footProfile.findUnique({ where: { userId: session.userId } })
    : null;
  const askedMm = Number(searchParams.mm);
  const footMm = isPlausibleFoot(askedMm)
    ? Math.round(askedMm)
    : foot
    ? Math.round(foot.lengthMm)
    : null;

  const comparison = footMm ? compareBrands(footMm, audience, brands, verdicts) : [];

  const selectedBrand =
    searchParams.brand && brands.includes(searchParams.brand) ? searchParams.brand : brands[0];
  const { chart, systems, rows } = buildChart(selectedBrand, audience);

  return (
    <div className="container-app py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Size chart", path: "/size-chart" }
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: metadata.title as string,
            description: metadata.description as string,
            url: `${SITE.url}/size-chart`
          }
        ]}
      />

      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <Ruler size={14} /> Size chart
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          What your foot measures in every brand
        </h1>
        <p className="mt-3 text-slate-600">
          &ldquo;UK 9&rdquo; isn&apos;t a measurement — it&apos;s a label each brand prints on its
          own last. So comparing one brand&apos;s label to another&apos;s tells you
          nothing. Give us your foot length in millimetres and we&apos;ll convert it
          back for each brand, then show what real buyers said about that
          brand&apos;s fit.
        </p>
      </div>

      {/* ---- input ---- */}
      <form className="mt-8 card flex flex-wrap items-end gap-4 p-5" action="/size-chart">
        <div>
          <label htmlFor="mm" className="mb-1.5 block text-sm font-medium text-slate-600">
            Foot length (mm)
          </label>
          <input
            id="mm"
            name="mm"
            type="number"
            min={90}
            max={360}
            defaultValue={footMm ?? ""}
            placeholder="267"
            className="input w-40"
          />
        </div>
        <div>
          <label htmlFor="audience" className="mb-1.5 block text-sm font-medium text-slate-600">
            Chart
          </label>
          <select id="audience" name="audience" defaultValue={audience} className="input w-40">
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
          </select>
        </div>
        <button className="btn-primary">Compare brands</button>
        <Link href="/foot-scan" className="btn-ghost">
          Don&apos;t know it? Measure your foot
        </Link>
      </form>

      {/* ---- cross-brand comparison ---- */}
      {footMm ? (
        <section className="mt-8">
          <h2 className="text-xl font-black text-slate-900">
            A {footMm} mm foot, brand by brand
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {foot && footMm === Math.round(foot.lengthMm)
              ? "Using your saved measurement."
              : "Using the length you entered."}{" "}
            The label column is the size that brand prints; the adjusted column
            accounts for what buyers report.
          </p>

          <div className="mt-4 card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">Brand</th>
                  <th className="p-3">Their label</th>
                  <th className="p-3">Buyers say</th>
                  <th className="p-3">We&apos;d buy</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.map((r) => (
                  <tr key={r.brand}>
                    <td className="p-3 font-semibold text-slate-900">
                      <Link href={`/brands/${encodeURIComponent(r.brand)}`} className="hover:text-brand-600">
                        {r.brand}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap font-bold tabular-nums text-slate-900">
                      {SYSTEM_LABEL[r.primary].replace(" (foot length)", "")} {r.label}
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.fitVerdict ? (
                        <span
                          className={
                            r.fitVerdict === "true-to-size"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          runs {r.fitVerdict.replace(/-/g, " ")}
                          <span className="ml-1 text-xs text-slate-400">({r.reviews})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">no reviews yet</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap font-bold tabular-nums">
                      {r.adjustedLabel !== null ? (
                        <span className="text-amber-700">
                          {SYSTEM_LABEL[r.primary].replace(" (foot length)", "")} {r.adjustedLabel}
                        </span>
                      ) : (
                        <span className="text-slate-500">same</span>
                      )}
                    </td>
                    <td className="p-3 text-xs leading-snug text-slate-500">{r.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          Enter a foot length above — or{" "}
          <Link href="/foot-scan" className="font-semibold text-brand-600 hover:underline">
            measure your foot
          </Link>{" "}
          — to see the brand-by-brand comparison.
        </p>
      )}

      {/* ---- single-brand full chart ---- */}
      <section className="mt-12">
        <h2 className="text-xl font-black text-slate-900">Full chart by brand</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {brands.map((b) => (
            <Link
              key={b}
              href={`/size-chart?brand=${encodeURIComponent(b)}&audience=${audience}${footMm ? `&mm=${footMm}` : ""}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition ${
                b === selectedBrand
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {b}
            </Link>
          ))}
        </div>

        {chart.note && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
            <Info size={15} className="mt-0.5 shrink-0" />
            {chart.note}
          </p>
        )}

        <div className="mt-4 card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Foot length</th>
                {systems.map((s) => (
                  <th key={s} className="p-3">
                    {SYSTEM_LABEL[s]}
                    {s === chart.primary && (
                      <span className="ml-1 font-normal normal-case text-brand-600">· on the box</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const isYours = footMm !== null && Math.abs(r.footMm - footMm) < 2.5;
                return (
                  <tr key={r.footMm} className={isYours ? "bg-brand-50" : undefined}>
                    <td className="p-3 whitespace-nowrap tabular-nums text-slate-700">
                      {r.footMm} mm
                      {isYours && (
                        <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          you
                        </span>
                      )}
                    </td>
                    {systems.map((s: SizeSystem) => (
                      <td key={s} className="p-3 tabular-nums text-slate-900">
                        {r.labels[s]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- honesty about where the numbers come from ---- */}
      <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
        <p className="flex items-start gap-2">
          <BadgeCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            <strong className="text-slate-800">Where these numbers come from.</strong> The
            charts are the standard conversions — UK on the barleycorn scale (one
            size = 8.47 mm), EU on the Paris point (6.67 mm), and cm as the foot
            length itself. They are a faithful conversion, not a transcription of
            each brand&apos;s own PDF, and a brand&apos;s published chart can differ by
            about half a size. That&apos;s exactly why the &ldquo;buyers say&rdquo; column exists:
            where a brand&apos;s chart and its actual shoes disagree, the buyers are
            usually right.
          </span>
        </p>
        <p className="mt-3 flex items-start gap-2">
          <ArrowRight size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            Sizing is only half of fit — width and arch matter just as much.{" "}
            <Link href="/foot-scan" className="font-semibold text-brand-600 hover:underline">
              Measure your foot
            </Link>{" "}
            to get width and arch alongside the length, or{" "}
            <Link href="/brands" className="font-semibold text-brand-600 hover:underline">
              read the brand scorecards
            </Link>
            .
          </span>
        </p>
      </div>
    </div>
  );
}
