/**
 * Verifiable facts about footwear sizing, used for the quiz and the fact cards.
 *
 * Every entry here is either arithmetic (a barleycorn is a third of an inch) or a
 * documented convention (Paris points, Japanese cm on the box, Crocs' paired
 * sizing). Nothing in this file is a statistic about the market, a sales figure,
 * or a claim about what Indians buy — we do not have that data and inventing it
 * to make a quiz more fun would poison the one thing this platform sells, which
 * is being right about brands.
 *
 * The `source` line is what we would show a brand that asked where a claim came
 * from. If a fact cannot carry one, it does not belong here.
 */

export type QuizQuestion = {
  q: string;
  options: string[];
  /** Index into options. */
  answer: number;
  /** Shown after answering, whether right or wrong. */
  because: string;
  source: string;
};

export const QUIZ: QuizQuestion[] = [
  {
    q: "One full UK shoe size is how many millimetres?",
    options: ["4 mm", "8.5 mm", "15 mm", "25 mm"],
    answer: 1,
    because:
      "A UK size step is one barleycorn — a third of an inch, 8.47 mm. A half size is barely 4.2 mm. That is why a measurement that is 'roughly right' can still put you a size out, and why we publish our error margin instead of hiding it.",
    source: "Arithmetic: 25.4 mm ÷ 3. The same constant our sizing code uses."
  },
  {
    q: "European sizes go up in steps of…",
    options: ["1 cm", "6.67 mm", "8.47 mm", "half an inch"],
    answer: 1,
    because:
      "EU sizes use the Paris point: two-thirds of a centimetre, 6.67 mm. Smaller steps than UK, which is why EU numbers rarely convert to a neat UK half size — and why brands round differently from each other.",
    source: "The Paris point, the standard behind Continental European sizing."
  },
  {
    q: "A children's UK size 13 and an adult UK size 13 — how far apart are the feet?",
    options: [
      "They're the same length",
      "About 4 cm apart",
      "About 11 cm apart",
      "Kids' 13 is bigger"
    ],
    answer: 2,
    because:
      "The UK child scale restarts from zero, so children's 13 sits just below adult 1. Treating a child's foot on the adult scale is the classic sizing bug — it makes every small foot come out as the smallest adult size.",
    source:
      "UK child scale: 3 × last-inches − 12, against − 25 for adults. This exact bug existed in our own code and was fixed."
  },
  {
    q: "What number does Asics print on its box that is genuinely useful?",
    options: [
      "The UK size",
      "The centimetre length of your foot",
      "The width grade",
      "The sole thickness"
    ],
    answer: 1,
    because:
      "Japanese sizing is stated in centimetres of foot length. That is the one number on a shoebox that means something absolute rather than relative to a brand's own last.",
    source: "Japanese (JIS) footwear sizing convention, which Asics follows."
  },
  {
    q: "When is the best time of day to measure your feet?",
    options: ["First thing in the morning", "Evening", "It makes no difference", "After a bath"],
    answer: 1,
    because:
      "Feet swell over the day. Measure in the morning and the shoe that fits can feel tight by evening — so measure late, and fit for your feet at their largest.",
    source: "Standard fitting practice, and the reason our scan guidance says the same."
  },
  {
    q: "Your left and right feet measure differently. Which one should the shoe fit?",
    options: ["The smaller one", "The larger one", "The average", "Whichever hurts less"],
    answer: 1,
    because:
      "Most people have feet of slightly different lengths. Fit the larger foot — you can pad out a shoe that is a little loose, but you cannot make a tight one longer.",
    source: "Standard fitting practice; asymmetry between feet is the norm, not the exception."
  },
  {
    q: "Crocs label a pair 'M8 / W10'. What does that mean?",
    options: [
      "It fits both men's 8 and women's 10 — the same shoe",
      "There are two shoes in the box",
      "M8 is the length, W10 the width",
      "It's a manufacturing code"
    ],
    answer: 0,
    because:
      "It is one shoe with two labels, because US men's and women's numbering sits about 1.5 sizes apart. Paired sizing confuses more shoppers than any other convention we see.",
    source: "Crocs' own paired sizing convention. Noted against Crocs in our directory."
  },
  {
    q: "Which of these brands is not Indian in origin?",
    options: ["Relaxo", "Campus", "Bata", "Paragon"],
    answer: 2,
    because:
      "Bata was founded in Zlín in 1894, in what is now Czechia. Bata India has been listed here since 1973 and makes most of what it sells in India — which is why almost everyone assumes it started here.",
    source: "Company history; Bata India Ltd is the Indian listed entity."
  }
];

export type FootFact = { title: string; body: string; source: string };

/** Short cards for pages where a quiz would be too much. */
export const FACTS: FootFact[] = [
  {
    title: "One shoe size is 8.5 mm",
    body:
      "A third of an inch — a barleycorn. Half a size is 4.2 mm. So a measurement that is 'close enough' often isn't, and any tool that won't tell you its error margin is hiding something.",
    source: "25.4 ÷ 3 mm"
  },
  {
    title: "Sizes are a brand's opinion, not a standard",
    body:
      "There is no enforced international shoe size. Each brand builds its own last, so the same UK 8 differs between two boxes on the same shelf. This is why we show what real buyers report about a brand's fit rather than trusting its chart.",
    source: "Absence of a binding size standard; observed across brand charts"
  },
  {
    title: "Foot length in centimetres is the only honest number",
    body:
      "UK, EU and US numbers all describe the shoe. The centimetre length describes your foot. Measure that once and every chart becomes readable.",
    source: "Mondopoint / Japanese cm sizing"
  },
  {
    title: "Wide feet are not a size problem",
    body:
      "Going up a size to gain width makes a shoe too long, so it slides and blisters. Width grades exist for this — New Balance publishes 2E and 4E, and a handful of others do too.",
    source: "Published brand width grades"
  }
];
