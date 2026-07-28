/**
 * The outcome loop: did the guidance actually help?
 *
 * WHY THIS EXISTS
 *
 * Every other number this app can produce is an input — searches, scans, clicks
 * out to brands. None of them says whether anybody's feet felt better. For a tool
 * that positions itself around foot health that is the only measure that counts,
 * and it is the one thing a grant reviewer or an investor will ask for that a
 * shopping site cannot answer.
 *
 * HOW IT WORKS
 *
 * When a screening produces footwear guidance for someone who is logging pain, we
 * freeze that moment as a CareEpisode: how many days of pain, where, and what we
 * suggested. Four weeks later we ask two questions — did you change your footwear,
 * and is the pain better. Nothing else.
 *
 * WHAT IT IS AND ISN'T
 *
 * Self-reported, unblinded, no control group, and people who feel better are more
 * likely to answer at all. So the comparison worth reporting is not "N% improved"
 * but "N% of those who acted on the guidance improved, against M% of those who
 * didn't" — with the response rate stated next to it. `summarise()` returns both,
 * and refuses to compute a rate at all below a floor where the number would be
 * noise dressed as evidence.
 */

export const FOLLOW_UP_DAYS = 28;

/** Below this many answered episodes, a percentage is theatre. Report counts instead. */
export const MIN_EPISODES_FOR_RATE = 10;

/** Pain has to be present for "did it get better" to mean anything. */
const MIN_BASELINE_PAIN_DAYS = 1;

export type EpisodeBaseline = {
  baselinePainDays: number;
  baselinePainAreas: string;
  needs: string;
  archType: string;
  widthCategory: string;
  followUpDueAt: Date;
};

/**
 * Should we open an episode right now?
 *
 * Deliberately narrow. No episode when a red flag is present (we withheld the
 * footwear advice, so there is nothing to follow up on and asking "is the pain
 * better?" instead of "did you see a doctor?" would be the wrong question), none
 * without pain to improve on, and none without guidance actually given.
 */
export function shouldOpenEpisode(screening: {
  urgent: boolean;
  needs: string[];
  summary: { painDays: number };
}): boolean {
  if (screening.urgent) return false;
  if (screening.needs.length === 0) return false;
  return screening.summary.painDays >= MIN_BASELINE_PAIN_DAYS;
}

export function baselineFrom(
  screening: {
    needs: string[];
    summary: { painDays: number; painAreas: string[] };
  },
  foot: { archType?: string | null; widthCategory?: string | null } | null,
  now: Date
): EpisodeBaseline {
  return {
    baselinePainDays: screening.summary.painDays,
    baselinePainAreas: screening.summary.painAreas.join(","),
    needs: screening.needs.join(","),
    archType: foot?.archType || "",
    widthCategory: foot?.widthCategory || "",
    followUpDueAt: new Date(now.getTime() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000)
  };
}

export const PAIN_CHANGES = ["gone", "better", "same", "worse"] as const;
export const FOOTWEAR_CHANGES = ["yes", "partly", "no"] as const;

export type PainChange = (typeof PAIN_CHANGES)[number];
export type FootwearChange = (typeof FOOTWEAR_CHANGES)[number];

export function isPainChange(v: unknown): v is PainChange {
  return typeof v === "string" && (PAIN_CHANGES as readonly string[]).includes(v);
}
export function isFootwearChange(v: unknown): v is FootwearChange {
  return typeof v === "string" && (FOOTWEAR_CHANGES as readonly string[]).includes(v);
}

/** "gone" and "better" count as improvement; "same" and "worse" do not. */
export function improved(painChange: string): boolean {
  return painChange === "gone" || painChange === "better";
}

export type OutcomeSummary = {
  opened: number;
  due: number;
  answered: number;
  dismissed: number;
  /** answered / (answered + dismissed + overdue) — stated, never hidden. */
  responseRatePct: number | null;
  /** Null until MIN_EPISODES_FOR_RATE answers exist. */
  actedImprovedPct: number | null;
  notActedImprovedPct: number | null;
  acted: number;
  notActed: number;
  byPainChange: Record<string, number>;
  medianComfort: number | null;
  /** Set when the numbers are too small to quote as rates. */
  tooEarly: boolean;
};

export function summarise(
  episodes: {
    followUpAt: Date | null;
    dismissedAt: Date | null;
    followUpDueAt: Date;
    changedFootwear: string;
    painChange: string;
    comfortRating: number | null;
  }[],
  now: Date
): OutcomeSummary {
  const answered = episodes.filter((e) => e.followUpAt);
  const dismissed = episodes.filter((e) => !e.followUpAt && e.dismissedAt);
  const due = episodes.filter(
    (e) => !e.followUpAt && !e.dismissedAt && e.followUpDueAt.getTime() <= now.getTime()
  );

  // The denominator is everyone who was actually asked — not everyone with an
  // episode. Counting people whose four weeks haven't elapsed as non-responders
  // would make the response rate look worse than it is.
  const asked = answered.length + dismissed.length + due.length;

  const acted = answered.filter((e) => e.changedFootwear === "yes" || e.changedFootwear === "partly");
  const notActed = answered.filter((e) => e.changedFootwear === "no");

  const pct = (part: number, whole: number) =>
    whole === 0 ? null : Math.round((part / whole) * 100);

  const enough = answered.length >= MIN_EPISODES_FOR_RATE;

  const byPainChange: Record<string, number> = {};
  for (const k of PAIN_CHANGES) byPainChange[k] = 0;
  for (const e of answered) {
    if (e.painChange in byPainChange) byPainChange[e.painChange] += 1;
  }

  const comforts = answered
    .map((e) => e.comfortRating)
    .filter((r): r is number => typeof r === "number")
    .sort((a, b) => a - b);
  const medianComfort =
    comforts.length === 0
      ? null
      : comforts.length % 2
        ? comforts[(comforts.length - 1) / 2]
        : Number(((comforts[comforts.length / 2 - 1] + comforts[comforts.length / 2]) / 2).toFixed(1));

  return {
    opened: episodes.length,
    due: due.length,
    answered: answered.length,
    dismissed: dismissed.length,
    responseRatePct: pct(answered.length, asked),
    actedImprovedPct: enough ? pct(acted.filter((e) => improved(e.painChange)).length, acted.length) : null,
    notActedImprovedPct: enough
      ? pct(notActed.filter((e) => improved(e.painChange)).length, notActed.length)
      : null,
    acted: acted.length,
    notActed: notActed.length,
    byPainChange,
    medianComfort,
    tooEarly: !enough
  };
}
