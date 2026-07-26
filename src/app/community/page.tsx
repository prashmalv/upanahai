import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AskQuestionForm } from "@/components/AskQuestionForm";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/seo";
import { MessageSquare, BadgeCheck, Search, HelpCircle, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Footwear Community — Ask Where to Buy & Whether to Buy",
  description:
    "Ask real people where to find a specific shoe in India, or whether a pair is worth buying. Shoppers and brand representatives answer in public. Free, and you can track answers to your own questions.",
  keywords: [
    "where to buy shoes India",
    "shoe buying advice India",
    "footwear forum India",
    "is this shoe worth buying",
    "shoe community questions"
  ],
  alternates: { canonical: "/community" }
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "find", label: "Help me find it" },
  { key: "advice", label: "Should I buy it?" },
  { key: "unanswered", label: "Unanswered" }
];

export default async function CommunityPage({
  searchParams
}: {
  searchParams: { kind?: string };
}) {
  const filter = searchParams.kind || "";

  const where =
    filter === "unanswered"
      ? { status: "open" }
      : filter === "find" || filter === "advice"
      ? { kind: filter }
      : {};

  const [questions, session, stats] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true, city: true, state: true } },
        answers: {
          select: { id: true, brandName: true },
          orderBy: { createdAt: "asc" }
        }
      }
    }),
    getSession(),
    Promise.all([prisma.question.count(), prisma.answer.count()])
  ]);

  const [totalQ, totalA] = stats;

  return (
    <div className="container-app py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Upanah.AI footwear community",
          description: metadata.description as string,
          url: `${SITE.url}/community`
        }}
      />

      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <Users size={14} /> Community
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Ask people who&apos;ve actually worn them
        </h1>
        <p className="mt-3 text-slate-600">
          Two kinds of question get answered fastest here:{" "}
          <strong className="font-semibold text-slate-900">
            &ldquo;where can I get this shoe?&rdquo;
          </strong>{" "}
          and{" "}
          <strong className="font-semibold text-slate-900">
            &ldquo;is this worth buying?&rdquo;
          </strong>{" "}
          Shoppers answer from experience; brand representatives can reply
          officially and their answers are badged so you know who&apos;s speaking.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {totalQ.toLocaleString("en-IN")} questions · {totalA.toLocaleString("en-IN")} answers
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.key || "all"}
                href={f.key ? `/community?kind=${f.key}` : "/community"}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
                  filter === f.key
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {questions.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
              No questions here yet. Be the first to ask — it takes a minute.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {questions.map((q) => {
                const brandReplies = q.answers.filter((a) => a.brandName).length;
                const asker = q.user.name || q.user.email.split("@")[0];
                return (
                  <li key={q.id}>
                    <Link
                      href={`/community/${q.id}`}
                      className="card block p-5 transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                            q.kind === "find"
                              ? "bg-brand-50 text-brand-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}
                        >
                          {q.kind === "find" ? <Search size={16} /> : <HelpCircle size={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-bold leading-snug text-slate-900">{q.title}</h2>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{q.body}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{asker}</span>
                            {q.user.city && <span>· {q.user.city}</span>}
                            <span>
                              ·{" "}
                              {q.createdAt.toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short"
                              })}
                            </span>
                            {q.category && <span className="chip">{q.category}</span>}
                            {q.brand && <span className="chip">{q.brand}</span>}
                            {q.budget && <span className="chip">≤ ₹{q.budget.toLocaleString("en-IN")}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="flex items-center gap-1 text-sm font-bold text-slate-900">
                            <MessageSquare size={13} /> {q.answers.length}
                          </p>
                          {brandReplies > 0 && (
                            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                              <BadgeCheck size={11} /> Brand replied
                            </p>
                          )}
                          {q.answers.length === 0 && (
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                              Unanswered
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AskQuestionForm signedIn={!!session} />
        </div>
      </div>
    </div>
  );
}
