import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AnswerForm, HelpfulButton } from "@/components/AnswerForm";
import { JsonLd } from "@/components/JsonLd";
import { SITE, breadcrumbJsonLd } from "@/lib/seo";
import { BadgeCheck, MessageSquare, Search, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const q = await prisma.question.findUnique({
    where: { id: params.id },
    include: { answers: { select: { id: true } } }
  });
  if (!q) return { title: "Question not found" };

  const description = `${q.body.slice(0, 150)}${q.body.length > 150 ? "…" : ""} — ${
    q.answers.length
  } ${q.answers.length === 1 ? "answer" : "answers"} from Upanah.AI shoppers and brands.`;

  return {
    title: q.title,
    description,
    alternates: { canonical: `/community/${q.id}` },
    openGraph: { title: q.title, description, url: `/community/${q.id}` }
  };
}

export default async function QuestionPage({ params }: { params: { id: string } }) {
  const q = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, city: true, state: true } },
      answers: {
        orderBy: [{ helpful: "desc" }, { createdAt: "asc" }],
        include: {
          user: { select: { id: true, name: true, email: true, city: true, role: true } }
        }
      }
    }
  });
  if (!q) notFound();

  const session = await getSession();

  // Public view counter. Not counted for the asker so their own refreshes don't
  // inflate it.
  if (!session || session.userId !== q.userId) {
    await prisma.question.update({
      where: { id: q.id },
      data: { views: { increment: 1 } }
    });
  }

  const asker = q.user.name || q.user.email.split("@")[0];
  const isMine = session?.userId === q.userId;

  return (
    <div className="container-app py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Community", path: "/community" },
            { name: q.title.slice(0, 60), path: `/community/${q.id}` }
          ]),
          // QAPage markup makes the thread eligible for Google's Q&A rich result
          // and gives answer engines a clean question→answer pairing to quote.
          {
            "@context": "https://schema.org",
            "@type": "QAPage",
            mainEntity: {
              "@type": "Question",
              name: q.title,
              text: q.body,
              answerCount: q.answers.length,
              dateCreated: q.createdAt.toISOString(),
              author: { "@type": "Person", name: asker },
              url: `${SITE.url}/community/${q.id}`,
              ...(q.answers.length
                ? {
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: q.answers[0].body,
                      dateCreated: q.answers[0].createdAt.toISOString(),
                      upvoteCount: q.answers[0].helpful,
                      author: {
                        "@type": "Person",
                        name:
                          q.answers[0].brandName ||
                          q.answers[0].user.name ||
                          q.answers[0].user.email.split("@")[0]
                      }
                    },
                    suggestedAnswer: q.answers.slice(1).map((a) => ({
                      "@type": "Answer",
                      text: a.body,
                      dateCreated: a.createdAt.toISOString(),
                      upvoteCount: a.helpful,
                      author: {
                        "@type": "Person",
                        name: a.brandName || a.user.name || a.user.email.split("@")[0]
                      }
                    }))
                  }
                : {})
            }
          }
        ]}
      />

      <nav className="text-sm text-slate-500">
        <Link href="/community" className="hover:text-brand-600">
          Community
        </Link>{" "}
        / <span className="text-slate-700">{q.kind === "find" ? "Help me find it" : "Should I buy it?"}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {/* question */}
          <article className="card p-6">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  q.kind === "find" ? "bg-brand-50 text-brand-600" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {q.kind === "find" ? <Search size={18} /> : <HelpCircle size={18} />}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-black leading-snug text-slate-900 md:text-2xl">
                  {q.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{asker}</span>
                  {q.user.city && <span>· {q.user.city}</span>}
                  <span>
                    ·{" "}
                    {q.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                  <span>· {q.views} views</span>
                  {isMine && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                      Your question
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-700">{q.body}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {q.brand && <span className="chip">{q.brand}</span>}
              {q.category && <span className="chip">{q.category}</span>}
              {q.city && <span className="chip">{q.city}</span>}
              {q.budget && <span className="chip">Budget ≤ ₹{q.budget.toLocaleString("en-IN")}</span>}
            </div>
          </article>

          {/* answers */}
          <h2 className="mt-8 flex items-center gap-2 text-lg font-black text-slate-900">
            <MessageSquare size={18} className="text-brand-600" />
            {q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}
          </h2>

          {q.answers.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No answers yet. If you know this one, you&apos;d be genuinely helping.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {q.answers.map((a) => {
                const name = a.user.name || a.user.email.split("@")[0];
                return (
                  <li key={a.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{name}</span>
                        {a.brandName ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                            <BadgeCheck size={11} /> {a.brandName} official
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">shopper</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {a.createdAt.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
                      {a.body}
                    </p>
                    <div className="mt-3">
                      <HelpfulButton
                        answerId={a.id}
                        initial={a.helpful}
                        canVote={!!session && session.userId !== a.userId}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AnswerForm
            questionId={q.id}
            signedIn={!!session}
            brandName={session?.role === "brand" ? session.brandName : undefined}
          />
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            Brand accounts get an <strong>official</strong> badge on their answers, so
            you can weigh a brand&apos;s own reply differently from a shopper&apos;s.
            Nobody can self-apply that badge.
          </p>
        </div>
      </div>
    </div>
  );
}
