/**
 * Foot health screening.
 *
 * WHAT THIS IS
 *
 * A preventive screen that turns three things the user has already given us —
 * foot measurements, an activity log, and where it hurts — into (a) footwear
 * features likely to help and (b) a clear statement of when to stop reading a
 * shoe website and see a clinician.
 *
 * WHAT THIS IS NOT
 *
 * Not a diagnosis, not a medical device, and it must never read like one. Every
 * observation below is phrased as an association and a thing to raise with a
 * doctor, never as a condition the user has. The measurement it rests on is
 * accurate to a few millimetres at best (see lib/fit.ts), which is fine for
 * choosing footwear and nowhere near clinical.
 *
 * RED FLAGS COME FIRST, AND THEY SILENCE EVERYTHING ELSE
 *
 * Numbness, a sore or wound that isn't healing, and new one-sided swelling are
 * not footwear problems. In someone with diabetes they can precede ulceration and
 * worse. `screen()` returns `urgent` for those and the UI must show referral
 * guidance *instead of* shoe advice — replying to a possible ulcer with a product
 * recommendation would be the most harmful thing this product could do.
 */

export type PainArea = "heel" | "arch" | "forefoot" | "knee" | "none" | "";

export type ScreeningInput = {
  lengthMm?: number | null;
  widthMm?: number | null;
  archType?: string | null;
  widthCategory?: string | null;
  logs: {
    date: Date;
    steps: number;
    distanceKm: number;
    activity: string;
    painArea: string;
    numbness: boolean;
    woundOrSore: boolean;
    swelling: boolean;
  }[];
  persona?: string | null;
  /** Self-declared. Lowers the referral threshold and adds standing guidance. */
  diabetes?: boolean;
};

export type Observation = {
  /** Short, plain-language heading. */
  title: string;
  /** What was seen in the data. Facts only. */
  because: string;
  /** Footwear features associated with helping — never a treatment claim. */
  footwear: string[];
  /** When this stops being a footwear question. */
  seeSomeoneIf?: string;
};

export type RedFlag = {
  title: string;
  detail: string;
  action: string;
};

export type Screening = {
  /** true when a red flag is present — the UI must lead with referral, not shoes. */
  urgent: boolean;
  redFlags: RedFlag[];
  observations: Observation[];
  /** Aggregates worth showing back to the user. */
  summary: {
    daysLogged: number;
    totalKm: number;
    totalSteps: number;
    painDays: number;
    painAreas: string[];
    weeklyKm: number;
  };
  /** Footwear features to prioritise, deduplicated, for the recommender. */
  needs: string[];
  /** True when there simply isn't enough data to say anything useful. */
  insufficientData: boolean;
};

const RED_FLAG_WINDOW_DAYS = 30;
/** Pain on this many days out of the logged window stops being incidental. */
const PERSISTENT_PAIN_DAYS = 4;

export function screen(input: ScreeningInput): Screening {
  const cutoff = Date.now() - RED_FLAG_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = input.logs.filter((l) => l.date.getTime() >= cutoff);

  const totalKm = Number(recent.reduce((s, l) => s + (l.distanceKm || 0), 0).toFixed(1));
  const totalSteps = recent.reduce((s, l) => s + (l.steps || 0), 0);
  const painLogs = recent.filter((l) => l.painArea && l.painArea !== "none");
  const painAreas = Array.from(new Set(painLogs.map((l) => l.painArea)));
  const daysLogged = new Set(recent.map((l) => l.date.toISOString().slice(0, 10))).size;
  const weeklyKm = daysLogged > 0 ? Number(((totalKm / daysLogged) * 7).toFixed(1)) : 0;

  // ---- red flags -------------------------------------------------------
  const redFlags: RedFlag[] = [];
  if (recent.some((l) => l.numbness)) {
    redFlags.push({
      title: "You reported numbness or loss of feeling",
      detail:
        "Reduced sensation means an injury can go unnoticed until it becomes serious. It is also a common early sign of nerve damage, including in diabetes.",
      action:
        "Please see a doctor about this before choosing footwear. If you have diabetes, ask specifically for a foot examination."
    });
  }
  if (recent.some((l) => l.woundOrSore)) {
    redFlags.push({
      title: "You reported a sore or wound that isn't healing",
      detail:
        "A break in the skin on the foot that is slow to heal needs assessment, not a different shoe. In someone with diabetes this can progress quickly.",
      action: "See a doctor promptly. Don't wait to see whether new footwear helps."
    });
  }
  if (recent.some((l) => l.swelling)) {
    redFlags.push({
      title: "You reported swelling",
      detail:
        "Swelling in one foot that is new, or is accompanied by warmth or redness, can have causes that have nothing to do with footwear.",
      action: "Have a doctor look at it, particularly if it affects only one side."
    });
  }

  // Diabetes changes the arithmetic. Reduced sensation means a bad fit does its
  // damage without being felt, so the same reported symptom warrants a faster
  // response — and pain that would otherwise be a footwear note becomes a reason
  // to have someone look at the foot.
  if (input.diabetes) {
    for (const f of redFlags) {
      f.action = f.action.replace(
        /$/,
        " You have told us you have diabetes, so please treat this as urgent rather than something to watch."
      );
    }
    if (redFlags.length === 0 && painLogs.length >= PERSISTENT_PAIN_DAYS) {
      redFlags.push({
        title: "Persistent foot pain, and you have told us you have diabetes",
        detail:
          `Pain logged on ${painLogs.length} separate days. With diabetes, foot problems can develop further than they feel, so pain that keeps returning is worth an examination rather than a different shoe.`,
        action:
          "Please ask your doctor or diabetes care team for a foot examination before changing footwear."
      });
    }
  }

  // ---- observations ----------------------------------------------------
  const observations: Observation[] = [];
  const needs = new Set<string>();

  const arch = (input.archType || "").toLowerCase();
  const width = (input.widthCategory || "").toLowerCase();

  if (arch === "flat") {
    needs.add("arch-support");
    observations.push({
      title: "Your scan suggests a low arch",
      because: "The foot scan classified your arch as flat.",
      footwear: ["Firm arch support", "Structured, stable midsole", "Avoid very flat, unsupported soles"],
      seeSomeoneIf:
        "you get heel or inner-ankle pain that lasts more than two weeks — a physiotherapist or podiatrist can assess whether you'd benefit from a fitted insole."
    });
  } else if (arch === "high") {
    needs.add("cushioning");
    needs.add("shock-absorption");
    observations.push({
      title: "Your scan suggests a high arch",
      because: "The foot scan classified your arch as high.",
      footwear: ["Generous cushioning", "Shock absorption under the heel and forefoot", "Flexible, not rigid, midsole"],
      seeSomeoneIf: "you feel pain along the outer edge of the foot, or your shoes wear out unevenly on the outside."
    });
  }

  if (width === "wide") {
    needs.add("wide-fit");
    observations.push({
      title: "Your foot measures wide for its length",
      because: `Width ${input.widthMm ?? "?"} mm against length ${input.lengthMm ?? "?"} mm puts you in the wide category.`,
      footwear: ["Wide-fit models (2E/4E where offered)", "Roomy toe box", "Avoid narrow formal lasts"],
      seeSomeoneIf:
        "you get numbness, tingling or burning across the ball of the foot — persistent pressure there is worth having looked at."
    });
  } else if (width === "narrow") {
    observations.push({
      title: "Your foot measures narrow for its length",
      because: `Width ${input.widthMm ?? "?"} mm against length ${input.lengthMm ?? "?"} mm puts you in the narrow category.`,
      footwear: ["Lace-ups that can be tightened", "Avoid slip-ons that rely on width to stay on"]
    });
  }

  if (painAreas.includes("heel")) {
    needs.add("cushioning");
    needs.add("arch-support");
    observations.push({
      title: "You've logged heel pain",
      because: `Heel pain recorded on ${painLogs.filter((l) => l.painArea === "heel").length} of your last ${daysLogged || 0} logged days.`,
      footwear: ["Cushioned heel", "Arch support", "Slight heel-to-toe drop rather than dead flat"],
      seeSomeoneIf:
        "it is worst in the first steps of the morning, or it persists beyond two to three weeks. That pattern is worth a clinician's opinion."
    });
  }
  if (painAreas.includes("arch")) {
    needs.add("arch-support");
    observations.push({
      title: "You've logged arch pain",
      because: "Arch pain appears in your recent logs.",
      footwear: ["Firm arch support", "Midsole that doesn't twist easily"],
      seeSomeoneIf: "the pain is sharp, or it keeps returning after rest."
    });
  }
  if (painAreas.includes("forefoot")) {
    needs.add("cushioning");
    observations.push({
      title: "You've logged forefoot pain",
      because: "Pain across the ball of the foot appears in your recent logs.",
      footwear: ["Cushioning under the forefoot", "Wider toe box", "Avoid raised heels"],
      seeSomeoneIf: "you also feel numbness or tingling in the toes."
    });
  }
  if (painAreas.includes("knee")) {
    needs.add("shock-absorption");
    needs.add("cushioning");
    observations.push({
      title: "You've logged knee pain",
      because: "Knee pain appears in your recent logs.",
      footwear: ["Shock absorption", "Stable heel", "Replace worn-out shoes — flattened midsoles stop absorbing load"],
      seeSomeoneIf:
        "the knee swells, locks or gives way. Footwear is only one of many factors in knee pain, and not usually the main one."
    });
  }

  if (painLogs.length >= PERSISTENT_PAIN_DAYS) {
    observations.push({
      title: "The pain looks persistent rather than occasional",
      because: `Pain logged on ${painLogs.length} separate days in the last ${RED_FLAG_WINDOW_DAYS}.`,
      footwear: [],
      seeSomeoneIf:
        "you haven't already spoken to someone about it. Pain lasting several weeks deserves an assessment; better footwear helps, but it isn't a substitute."
    });
  }

  if (weeklyKm >= 40 && painLogs.length > 0) {
    needs.add("cushioning");
    observations.push({
      title: "High weekly distance alongside pain",
      because: `About ${weeklyKm} km a week at your current logging rate, with pain recorded.`,
      footwear: ["More cushioning for high mileage", "Rotate between two pairs", "Replace running shoes well before they look worn out"],
      seeSomeoneIf: "pain increases as your distance does — that pattern suggests overload, not just footwear."
    });
  }

  if ((input.persona || "") === "senior") {
    needs.add("grip");
    observations.push({
      title: "Footwear and steadiness",
      because: "Your profile is set to senior, where grip and fit matter for confidence on foot.",
      footwear: ["High-grip outsole", "Secure fastening rather than loose slip-ons", "Low, stable heel", "Avoid worn, smooth soles"],
      seeSomeoneIf:
        "you have had a fall, or feel unsteady. Footwear is one factor a doctor will check among several."
    });
  }

  if (input.diabetes) {
    needs.add("wide-fit");
    needs.add("cushioning");
    observations.push({
      title: "Footwear when you have diabetes",
      because: "You have told us you have diabetes, which changes what a shoe needs to do.",
      footwear: [
        "Roomy toe box with no pressure points or hard internal seams",
        "Soft, cushioned insole that spreads load rather than concentrating it",
        "Adjustable fastening so the fit can be corrected through the day",
        "Check inside the shoe with your hand before wearing — a small stone can do a lot of damage you would not feel",
        "Avoid walking barefoot, including at home"
      ],
      seeSomeoneIf:
        "you notice any cut, blister, colour change or hardened skin — and in any case at the foot check your diabetes care team should be doing at least once a year."
    });
  }

  const insufficientData = !input.lengthMm && recent.length === 0;

  return {
    urgent: redFlags.length > 0,
    redFlags,
    observations,
    summary: {
      daysLogged,
      totalKm,
      totalSteps,
      painDays: painLogs.length,
      painAreas: painAreas.filter(Boolean),
      weeklyKm
    },
    needs: Array.from(needs),
    insufficientData
  };
}

/** Fixed text, versioned, so a consent record can point at exactly what was agreed. */
export const HEALTH_NOTICE_VERSION = "2026-07-28";

export const MEDICAL_DISCLAIMER =
  "Upanah.AI is not a medical device and does not diagnose or treat anything. " +
  "The foot scan is an estimate accurate to a few millimetres at best, and the " +
  "guidance here describes footwear features commonly associated with comfort — " +
  "it is not medical advice. For any pain, numbness, wound or swelling, please " +
  "see a qualified clinician.";
