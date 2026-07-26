/**
 * Tiny server-rendered chart primitives. Deliberately dependency-free: the
 * dashboard is a handful of bar rows and one sparkline, which is not worth
 * shipping a charting library (and its client bundle) for.
 */

export function StatTile({
  label,
  value,
  sub,
  accent = false
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ring-1 ${
        accent
          ? "bg-indigo-600 text-white ring-indigo-600"
          : "bg-white text-slate-900 ring-slate-100 shadow-soft"
      }`}
    >
      <p className={`text-xs font-medium ${accent ? "text-indigo-100" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-black tracking-tight">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${accent ? "text-indigo-100" : "text-slate-400"}`}>{sub}</p>
      )}
    </div>
  );
}

export function BarList({
  title,
  subtitle,
  rows,
  empty = "No data yet",
  format
}: {
  title: string;
  subtitle?: string;
  rows: { key: string; count: number }[];
  empty?: string;
  format?: (key: string) => string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <section className="card p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-slate-700" title={r.key}>
                  {format ? format(r.key) : r.key}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {r.count.toLocaleString("en-IN")}
                  {total > 0 && (
                    <span className="ml-1.5 text-xs text-slate-400">
                      {Math.round((r.count / total) * 100)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${max ? (r.count / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Sparkline({
  title,
  series
}: {
  title: string;
  series: { date: string; views: number; searches: number; signups: number }[];
}) {
  const max = Math.max(1, ...series.map((s) => Math.max(s.views, s.searches)));

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <div className="flex gap-4 text-xs">
          <Legend colour="bg-indigo-500" label="Page views" />
          <Legend colour="bg-sky-400" label="Searches" />
          <Legend colour="bg-emerald-500" label="Sign-ups" />
        </div>
      </div>

      {/* Each day is a full-height column so the percentage bar heights have
          something to resolve against; views and searches sit side by side
          rather than stacked, so neither hides the other. */}
      <div className="mt-5 flex h-36 items-stretch gap-[3px] overflow-x-auto">
        {series.map((s) => (
          <div
            key={s.date}
            className="flex h-full min-w-[7px] flex-1 flex-col justify-end"
            title={`${s.date} · ${s.views} views · ${s.searches} searches · ${s.signups} sign-ups`}
          >
            <div className="flex h-full items-end gap-[1px]">
              <div
                className="flex-1 rounded-t-sm bg-indigo-500"
                style={{ height: `${Math.max(s.views ? 2 : 0, (s.views / max) * 100)}%` }}
              />
              <div
                className="flex-1 rounded-t-sm bg-sky-400"
                style={{ height: `${Math.max(s.searches ? 2 : 0, (s.searches / max) * 100)}%` }}
              />
            </div>
            <div
              className={`mt-[2px] h-1 w-full rounded-sm ${
                s.signups > 0 ? "bg-emerald-500" : "bg-slate-100"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </section>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-500">
      <span className={`h-2 w-2 rounded-sm ${colour}`} />
      {label}
    </span>
  );
}
