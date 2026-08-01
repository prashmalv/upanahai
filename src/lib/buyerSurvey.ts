import { prisma } from "@/lib/db";

/**
 * How India buys footwear — the questions.
 *
 * WHY THIS IS NOT THE SIZING QUIZ
 *
 * The sizing quiz has right answers and exists to teach. This has none and exists
 * to listen. Nobody publishes what Indian shoppers actually do around footwear:
 * what happens to the pair they stop wearing, whether anyone compares before
 * buying, who in the family is hardest to buy for, how often a purchase is a
 * gamble. A platform positioned between shoppers and brands is the natural place
 * to find out, and the answers are worth more to a brand than any listing fee.
 *
 * RULES THE QUESTIONS FOLLOW
 *
 * - No leading options. "Do you struggle to find your size?" invites a yes; "How
 *   does finding your size usually go?" does not.
 * - Every question has an honest way out. Somebody who does not collect shoes,
 *   does not compare, or has never measured must find their real answer here,
 *   otherwise the data records what the options allowed rather than what is true.
 * - Nothing personal is asked. No name, no age, no income. The value is in the
 *   behaviour, and the moment it needs identity it needs consent machinery and
 *   loses most of its responses.
 */

export type SurveyQuestion = {
  key: string;
  /** Short label for the admin breakdown. */
  short: string;
  question: string;
  /** Why we ask — shown to the respondent, because a survey that explains itself gets finished. */
  why: string;
  choices: { key: string; label: string }[];
};

export const SURVEY: SurveyQuestion[] = [
  {
    key: "old-shoes",
    short: "Old shoes",
    question: "What usually happens to a pair you have stopped wearing?",
    why: "Almost nothing is known about what happens to footwear after the shop. It decides whether repair, resale or recycling is worth building for.",
    choices: [
      { key: "give-away", label: "Give it to someone who can use it" },
      { key: "keep", label: "Keep it — it might come in useful" },
      { key: "repair", label: "Get it repaired and carry on wearing it" },
      { key: "throw", label: "Throw it away" },
      { key: "sell", label: "Sell or exchange it" }
    ]
  },
  {
    key: "pairs-in-use",
    short: "Pairs in use",
    question: "In a normal week, how many pairs do you actually wear?",
    why: "Not how many you own — how many get used. The gap between the two is the interesting part.",
    choices: [
      { key: "one", label: "One. The same pair, every day" },
      { key: "two-three", label: "Two or three, depending on where I'm going" },
      { key: "four-plus", label: "Four or more" }
    ]
  },
  {
    key: "storage",
    short: "How they're kept",
    question: "Where do your shoes live at home?",
    why: "Somebody with a dedicated rack thinks about footwear differently from somebody with one pair by the door. Both are worth understanding.",
    choices: [
      { key: "dedicated", label: "A rack or almirah kept just for footwear" },
      { key: "boxes", label: "In their boxes, put away properly" },
      { key: "by-door", label: "By the door, wherever they land" },
      { key: "scattered", label: "Honestly, all over the place" }
    ]
  },
  {
    key: "compare",
    short: "Comparing",
    question: "Before buying, do you compare across brands or shops?",
    why: "Comparison is what this site is for. If most people do not, that is a finding, not a failure.",
    choices: [
      { key: "always", label: "Always — I check several before deciding" },
      { key: "sometimes", label: "Sometimes, if it is an expensive pair" },
      { key: "in-shop", label: "Only what is in front of me in the shop" },
      { key: "never", label: "No. I buy the same brand each time" }
    ]
  },
  {
    key: "size-experience",
    short: "Finding the size",
    question: "How does finding the right size usually go?",
    why: "One shoe size is 8.5 mm, and brands disagree with each other. We want to know how often that lands on the shopper.",
    choices: [
      { key: "easy", label: "Fine — I know my size and it works" },
      { key: "brand-varies", label: "Depends on the brand. I never quite know" },
      { key: "try-many", label: "I have to try several pairs every time" },
      { key: "return-often", label: "I often end up returning or exchanging" }
    ]
  },
  {
    key: "kept-bad-fit",
    short: "Kept a bad fit",
    question: "Have you ever kept shoes that did not really fit?",
    why: "A returned shoe is a cost the shop can see. A shoe kept and not worn is a cost nobody counts.",
    choices: [
      { key: "yes-hurt", label: "Yes — and they hurt, so I barely wore them" },
      { key: "yes-adjusted", label: "Yes, but I managed with an insole or thicker socks" },
      { key: "no-return", label: "No. I return anything that does not fit" },
      { key: "never", label: "It has not happened to me" }
    ]
  },
  {
    key: "hardest-for",
    short: "Hardest to buy for",
    question: "Who is hardest to buy footwear for in your family?",
    why: "This is the question we expect to be most useful to brands, and the one most likely to surprise them.",
    choices: [
      { key: "kids", label: "Children — their feet keep changing" },
      { key: "elders", label: "Elderly parents — comfort and grip are hard to judge" },
      { key: "women", label: "Women's footwear — sizing and fit vary too much" },
      { key: "sports", label: "Somebody who plays a sport seriously" },
      { key: "myself", label: "Myself" },
      { key: "none", label: "Nobody, it is straightforward" }
    ]
  },
  {
    key: "trigger",
    short: "What triggers a buy",
    question: "What made you buy your last pair?",
    why: "Whether footwear is bought out of need, occasion or opportunity changes what a shopper wants to be shown.",
    choices: [
      { key: "worn-out", label: "The old pair had worn out" },
      { key: "occasion", label: "A wedding, festival or occasion" },
      { key: "activity", label: "I started something new — running, gym, a job" },
      { key: "sale", label: "A sale or an offer" },
      { key: "wanted", label: "I just liked them" }
    ]
  },
  {
    key: "measured",
    short: "Knows the number",
    question: "Do you know your foot length in centimetres?",
    why: "It is the only measurement that means the same thing at every brand. We think almost nobody has it, and we would like to be wrong.",
    choices: [
      { key: "yes", label: "Yes, I have measured it" },
      { key: "roughly", label: "Roughly — I know my UK or EU size" },
      { key: "no", label: "No, never measured my feet" }
    ]
  },
  {
    key: "pain",
    short: "Foot pain",
    question: "Has footwear ever caused you pain that lasted more than a day?",
    why: "Fit is a health question, not only a comfort one. Answering does not record anything about your health — this is one anonymous tap.",
    choices: [
      { key: "often", label: "Yes, more than once" },
      { key: "once", label: "Once or twice" },
      { key: "no", label: "No" }
    ]
  }
];

/** Distinct people needed before we will publish a percentage. Matches the demand board. */
export const MIN_ANSWERS = 5;

export type QuestionResult = {
  key: string;
  short: string;
  question: string;
  total: number;
  /** null until MIN_ANSWERS people have answered — a percentage from three taps is theatre. */
  choices: { key: string; label: string; count: number; pct: number | null }[];
};

/** Aggregate results, optionally for one question only. */
export async function surveyResults(questionKey?: string): Promise<QuestionResult[]> {
  const rows = await prisma.surveyAnswer.groupBy({
    by: ["question", "choice"],
    where: questionKey ? { question: questionKey } : {},
    _count: true
  });

  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!counts.has(r.question)) counts.set(r.question, new Map());
    counts.get(r.question)!.set(r.choice, r._count);
  }

  return SURVEY.filter((q) => !questionKey || q.key === questionKey).map((q) => {
    const c = counts.get(q.key) ?? new Map<string, number>();
    const total = Array.from(c.values()).reduce((a, b) => a + b, 0);
    const enough = total >= MIN_ANSWERS;
    return {
      key: q.key,
      short: q.short,
      question: q.question,
      total,
      choices: q.choices.map((ch) => {
        const count = c.get(ch.key) ?? 0;
        return {
          key: ch.key,
          label: ch.label,
          count,
          pct: enough ? Math.round((count / total) * 100) : null
        };
      })
    };
  });
}

/** How many different people have answered anything at all. */
export async function surveyRespondents(): Promise<number> {
  const rows = await prisma.surveyAnswer.findMany({
    select: { visitorId: true },
    distinct: ["visitorId"]
  });
  return rows.length;
}
