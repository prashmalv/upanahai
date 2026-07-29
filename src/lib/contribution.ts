import { prisma } from "@/lib/db";

/**
 * A shopper's contribution standing.
 *
 * WHY THIS EXISTS
 *
 * The demand board and the brand advice are only worth reading if people
 * contribute — a brand rating with three reviews behind it steers nobody. This
 * gives the people who do contribute something to see, and gives a reader a way
 * to weigh advice: an answer from someone with forty verdicts behind them is not
 * the same as an answer from a fresh account.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * No points for logging in, no streaks, no daily-visit rewards. Those reward
 * showing up rather than helping, and on a platform whose only asset is being
 * trusted, paying people in status for volume is how review quality dies. Every
 * countable action here leaves something behind that another shopper can read.
 *
 * There is no public leaderboard either. A ranking invites gaming and puts
 * pressure on people to post when they have nothing to say.
 */

export type Level = {
  name: string;
  /** Contributions needed to reach it. */
  at: number;
  /** What it means to a reader, not what it means to the collector. */
  meaning: string;
};

export const LEVELS: Level[] = [
  { name: "New here", at: 0, meaning: "Nothing contributed yet — no weight either way." },
  { name: "Contributor", at: 1, meaning: "Has left something another shopper can use." },
  { name: "Regular", at: 5, meaning: "Has reviewed or answered a handful of times." },
  { name: "Trusted voice", at: 15, meaning: "A substantial body of verdicts behind their advice." },
  { name: "Pillar", at: 40, meaning: "One of the people this platform's advice rests on." }
];

export function levelFor(total: number): { level: Level; next: Level | null; toNext: number } {
  let level = LEVELS[0];
  for (const l of LEVELS) if (total >= l.at) level = l;
  const next = LEVELS[LEVELS.indexOf(level) + 1] ?? null;
  return { level, next, toNext: next ? next.at - total : 0 };
}

export type Contribution = {
  brandReviews: number;
  productReviews: number;
  questions: number;
  answers: number;
  total: number;
  level: Level;
  next: Level | null;
  toNext: number;
  /** The single most useful thing this person could do next, and why. */
  suggestion: { label: string; href: string; why: string };
};

export async function getContribution(userId: string): Promise<Contribution> {
  const [brandReviews, productReviews, questions, answers, hasFoot] = await Promise.all([
    prisma.brandFeedback.count({ where: { userId } }),
    prisma.feedback.count({ where: { userId } }),
    prisma.question.count({ where: { userId } }),
    prisma.answer.count({ where: { userId } }),
    prisma.footProfile.findUnique({ where: { userId }, select: { id: true } })
  ]);

  const total = brandReviews + productReviews + questions + answers;
  const { level, next, toNext } = levelFor(total);

  // Suggest the thing that is actually missing, in the order that helps most.
  const suggestion = !hasFoot
    ? {
        label: "Measure your feet",
        href: "/foot-scan",
        why: "Your own size makes every recommendation here specific instead of generic."
      }
    : brandReviews === 0
      ? {
          label: "Rate a brand you have worn",
          href: "/brands",
          why: "Brand fit advice needs three reviews before we will shift anyone's size. Yours could be one of them."
        }
      : answers === 0
        ? {
            label: "Answer someone's question",
            href: "/community",
            why: "Somebody is deciding what to buy right now, and you have worn the thing they are asking about."
          }
        : {
            label: "Review another brand",
            href: "/brands",
            why: "The brands with the fewest reviews are where your verdict changes the advice most."
          };

  return { brandReviews, productReviews, questions, answers, total, level, next, toNext, suggestion };
}

/**
 * Contribution counts for a set of users, for showing beside what they wrote.
 * One query per table rather than per user — this runs on every review list.
 */
export async function contributionCounts(
  userIds: string[]
): Promise<Map<string, number>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map();

  const [brand, product, answers] = await Promise.all([
    prisma.brandFeedback.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true }),
    prisma.feedback.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true }),
    prisma.answer.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: true })
  ]);

  const m = new Map<string, number>();
  const add = (id: string | null, n: number) => {
    if (!id) return;
    m.set(id, (m.get(id) ?? 0) + n);
  };
  for (const r of brand) add(r.userId, r._count);
  for (const r of product) add(r.userId, r._count);
  for (const r of answers) add(r.userId, r._count);
  return m;
}

/** Site-wide totals — motivating without naming anyone. */
export async function communityTotals() {
  const [brandReviews, productReviews, questions, answers, contributors] = await Promise.all([
    prisma.brandFeedback.count(),
    prisma.feedback.count(),
    prisma.question.count(),
    prisma.answer.count(),
    prisma.brandFeedback.findMany({ select: { userId: true }, distinct: ["userId"] })
  ]);
  return {
    verdicts: brandReviews + productReviews,
    questions,
    answers,
    contributors: contributors.filter((c) => c.userId).length
  };
}
