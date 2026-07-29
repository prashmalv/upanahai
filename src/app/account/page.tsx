import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCard, DISPLAYABLE } from "@/lib/products";
import { scoreProducts, deriveIntent } from "@/lib/recommender";
import { ProductCard } from "@/components/ProductCard";
import { StarRating } from "@/components/StarRating";
import { LogoutButton } from "@/components/LogoutButton";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { getContribution, LEVELS } from "@/lib/contribution";
import {
  User2, Ruler, Heart, Activity, MessageSquare, Star, ShieldCheck,
  BadgeCheck, ArrowRight, Sparkles
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false }
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");

  const [user, foot, wishlist, logs, myQuestions, myAnswers, myBrandReviews, myProductReviews,
         contribution] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId } }),
      prisma.footProfile.findUnique({ where: { userId: session.userId } }),
      prisma.wishlist.findMany({
        where: { userId: session.userId },
        include: { product: { include: { offers: true } } }
      }),
      prisma.healthLog.findMany({
        where: { userId: session.userId },
        orderBy: { date: "desc" },
        take: 30
      }),
      prisma.question.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        include: { answers: { select: { id: true, brandName: true } } }
      }),
      prisma.answer.count({ where: { userId: session.userId } }),
      prisma.brandFeedback.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" }
      }),
      prisma.feedback.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        include: { product: { select: { brand: true, name: true, slug: true } } }
      }),
      getContribution(session.userId)
    ]);

  // ---- personalised picks -------------------------------------------------
  // Built from what we actually know about this user: their persona, their
  // measured width/arch, and any pain they've logged. No guessing.
  const painAreas = Array.from(new Set(logs.map((l) => l.painArea).filter((p) => p && p !== "none")));
  const totalSteps = logs.reduce((s, l) => s + l.steps, 0);
  const totalKm = Number(logs.reduce((s, l) => s + l.distanceKm, 0).toFixed(1));

  const needs: string[] = [];
  if (foot?.archType === "flat") needs.push("arch-support");
  if (foot?.archType === "high") needs.push("cushioning");
  if (foot?.widthCategory === "wide") needs.push("wide-fit");
  if (painAreas.includes("heel") || painAreas.includes("arch")) needs.push("arch-support", "cushioning");
  if (painAreas.includes("knee")) needs.push("shock-absorption", "cushioning");

  const intent = deriveIntent("");
  intent.persona = (user?.persona === "kids-parent" ? "kids" : user?.persona) as any;
  intent.needs = Array.from(new Set(needs));

  const allProducts = await prisma.product.findMany({ where: DISPLAYABLE, include: { offers: true } });
  const wishedIds = new Set(wishlist.map((w) => w.productId));
  const picks = scoreProducts(allProducts, intent)
    .filter((r) => !wishedIds.has(r.product.id))
    .slice(0, 4);

  const whyPicked =
    needs.length > 0
      ? `Based on your ${foot ? `${foot.archType} arch, ${foot.widthCategory} width` : "profile"}${
          painAreas.length ? ` and the ${painAreas.join(" / ")} discomfort you logged` : ""
        }.`
      : foot
      ? "Based on your measured fit profile."
      : "Scan your feet or log a walk and these get properly personal.";

  const isAdmin = session.role === "admin";
  const isBrand = session.role === "brand";

  return (
    <div className="container-app py-10">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
            <User2 />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {user?.name || "My account"}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              <span>{user?.email}</span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                  <ShieldCheck size={11} /> Admin
                </span>
              )}
              {isBrand && user?.brandName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck size={11} /> {user.brandName} official
                </span>
              )}
              {!isAdmin && !isBrand && <span>· {user?.persona}</span>}
              {user?.city && <span>· {user.city}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/admin" className="btn-primary">
              <ShieldCheck size={16} /> Analytics dashboard
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      {/* at a glance */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <Ruler size={16} /> My fit profile
          </p>
          {foot ? (
            <div className="mt-3 space-y-0.5 text-sm text-slate-600">
              <p className="text-lg font-extrabold text-slate-900">UK {foot.ukSize}</p>
              <p>EU {foot.euSize} · US {foot.usSize}</p>
              <p>{Math.round(foot.lengthMm)} mm · {foot.widthCategory} width</p>
              <p>{foot.archType} arch</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Not scanned yet — this is what makes every recommendation fit.
            </p>
          )}
          <Link href="/foot-scan" className="btn-ghost mt-4">
            {foot ? "Re-scan" : "Scan my feet"}
          </Link>
        </div>

        <Link href="/wishlist" className="card flex flex-col justify-between p-5 transition hover:-translate-y-1">
          <p className="flex items-center gap-2 font-bold text-slate-900"><Heart size={16} /> Wishlist</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{wishlist.length}</p>
          <span className="text-sm text-brand-600">View saved shoes →</span>
        </Link>

        <Link href="/health" className="card flex flex-col justify-between p-5 transition hover:-translate-y-1">
          <p className="flex items-center gap-2 font-bold text-slate-900"><Activity size={16} /> Activity</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{totalKm} km</p>
          <span className="text-xs text-slate-500">
            {totalSteps.toLocaleString("en-IN")} steps logged
            {painAreas.length > 0 && ` · pain: ${painAreas.join(", ")}`}
          </span>
        </Link>

        <Link href="/community" className="card flex flex-col justify-between p-5 transition hover:-translate-y-1">
          <p className="flex items-center gap-2 font-bold text-slate-900"><MessageSquare size={16} /> Community</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{myQuestions.length}</p>
          <span className="text-xs text-slate-500">
            questions asked · {myAnswers} answers given
          </span>
        </Link>
      </div>

      {/* contribution standing — what this person has put in, and the single most
          useful thing they could do next. No streaks: rewarding turning up rather
          than helping is how a review section fills with noise. */}
      <section className="mt-8 rounded-2xl bg-slate-900 p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[240px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
              Your standing
            </p>
            <p className="mt-1 text-2xl font-black text-white">{contribution.level.name}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-300">
              {contribution.level.meaning}
            </p>
            {contribution.next && (
              <p className="mt-3 text-sm text-slate-400">
                {contribution.toNext} more{" "}
                {contribution.toNext === 1 ? "contribution" : "contributions"} to{" "}
                <span className="font-semibold text-slate-200">
                  {contribution.next.name}
                </span>
                .
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Brand reviews", contribution.brandReviews],
              ["Shoe reviews", contribution.productReviews],
              ["Questions", contribution.questions],
              ["Answers", contribution.answers]
            ].map(([label, n]) => (
              <div key={String(label)}>
                <dd className="text-2xl font-black text-white">{n as number}</dd>
                <dt className="text-xs text-slate-400">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* the level ladder, so the next step is legible rather than mysterious */}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
          {LEVELS.map((l) => (
            <span
              key={l.name}
              className={`text-xs ${
                contribution.total >= l.at
                  ? "font-bold text-indigo-300"
                  : "text-slate-500"
              }`}
            >
              {l.name}
              <span className="ml-1 text-slate-600">{l.at}+</span>
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-4">
          <p className="min-w-[220px] flex-1 text-sm text-slate-300">
            {contribution.suggestion.why}
          </p>
          <Link href={contribution.suggestion.href} className="btn-primary">
            {contribution.suggestion.label}
          </Link>
        </div>
      </section>

      {/* personalised picks */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Sparkles size={18} className="text-brand-600" /> Picked for you
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{whyPicked}</p>
          </div>
          {intent.needs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {intent.needs.map((n) => (
                <span key={n} className="chip">{n.replace(/-/g, " ")}</span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {picks.map((r) => (
            <ProductCard key={r.product.id} p={toCard(r.product, r.reasons)} />
          ))}
        </div>
      </section>

      {/* my questions */}
      <section className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="text-xl font-black text-slate-900">My questions</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Track answers to everything you&apos;ve asked.
          </p>

          {myQuestions.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              You haven&apos;t asked anything yet.{" "}
              <Link href="/community" className="font-semibold text-brand-600 hover:underline">
                Ask the community
              </Link>{" "}
              where to find a shoe, or whether one is worth buying.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myQuestions.map((q) => {
                const brandReplied = q.answers.some((a) => a.brandName);
                return (
                  <li key={q.id}>
                    <Link
                      href={`/community/${q.id}`}
                      className="card flex items-start justify-between gap-4 p-4 transition hover:-translate-y-0.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{q.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {q.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" · "}{q.views} views
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}
                        </p>
                        {brandReplied && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                            <BadgeCheck size={11} /> Brand replied
                          </p>
                        )}
                        {q.answers.length === 0 && (
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                            Waiting
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* my reviews */}
          <h2 className="mt-10 text-xl font-black text-slate-900">My reviews</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Your feedback is what makes this platform useful to the next shopper —
            and to the brands.
          </p>

          {myBrandReviews.length === 0 && myProductReviews.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No reviews yet.{" "}
              <Link href="/brands" className="font-semibold text-brand-600 hover:underline">
                Rate a brand
              </Link>{" "}
              you&apos;ve actually worn.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {myBrandReviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/brands/${encodeURIComponent(r.brand)}`}
                      className="font-semibold text-slate-900 hover:text-brand-600"
                    >
                      {r.brand} <span className="text-xs font-normal text-slate-400">(brand)</span>
                    </Link>
                    <StarRating value={r.rating} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{r.comment}</p>
                </div>
              ))}
              {myProductReviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/product/${r.product.slug}`}
                      className="font-semibold text-slate-900 hover:text-brand-600"
                    >
                      {r.product.brand} {r.product.name}
                    </Link>
                    <StarRating value={r.rating} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* settings column */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ChangePasswordForm />

          <div className="card p-5">
            <p className="flex items-center gap-2 font-bold text-slate-900">
              <Star size={16} /> Help the platform stay neutral
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Upanah.AI earns nothing from steering you to a costlier store. What
              keeps it honest is real feedback from people like you.
            </p>
            <Link href="/brands" className="btn-ghost mt-4 w-full justify-center">
              Rate a brand <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
