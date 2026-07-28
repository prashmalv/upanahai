import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { MEDICAL_DISCLAIMER, HEALTH_NOTICE_VERSION } from "@/lib/footHealth";
import { FOLLOW_UP_DAYS } from "@/lib/outcomes";
import {
  HeartPulse, Ruler, Stethoscope, ClipboardCheck, AlertTriangle,
  ArrowRight, Users, LineChart
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Foot health screening in India — how Upanah.AI works, and its limits",
  description:
    "Ill-fitting footwear is a preventable cause of foot pain and, in people with diabetes, of ulceration. Upanah.AI measures the foot, screens the activity and symptom log for red flags, refers people to a clinician when it should, and asks four weeks later whether anything improved. This page states the method and the limits.",
  alternates: { canonical: "/foot-health" }
};

/**
 * The public statement of what this is as a health tool.
 *
 * Written to be defensible line by line. Every claim on this page is either a
 * description of what the software actually does — checked against the code — or
 * a general statement about foot health that is uncontroversial. There are no
 * efficacy claims, no diagnosis language, and no invented statistics: where we
 * would like to cite a number about Indian feet, we say instead that the number
 * does not exist, which is itself the argument for collecting it.
 */

const FAQS = [
  {
    q: "Is Upanah.AI a medical device?",
    a: "No. It is a wellness and screening tool. It does not diagnose or treat any condition, and it is not registered as a medical device. Where the log suggests something that needs a clinician, it says so and withholds footwear suggestions instead of offering them alongside."
  },
  {
    q: "How accurate is the foot measurement?",
    a: "A tapped, perspective-corrected measurement against a reference object is good to roughly ±3 mm. A single-photo AI estimate is ±5 to ±14 mm depending on the model's confidence, and below a confidence threshold the app refuses to name a size at all rather than guess. One UK shoe size is 8.5 mm, so those margins matter and we state them on the result."
  },
  {
    q: "What counts as a red flag?",
    a: "Numbness or loss of feeling, a sore or wound that is not healing, and new swelling — particularly on one side. These are not footwear problems. When any is reported the app leads with referral guidance and suppresses its footwear advice entirely."
  },
  {
    q: "Why does footwear fit matter for people with diabetes?",
    a: "Reduced sensation in the feet means pressure damage from a poorly fitting shoe can go unnoticed until it becomes a wound. That is why foot examination is a routine part of diabetes care, and why a tool that asks about numbness should send people to a clinician rather than sell them a shoe."
  },
  {
    q: "What do you do with health data?",
    a: `Nothing is stored without explicit, recorded consent, and withdrawing consent deletes the foot profile, the activity log and the follow-up records rather than hiding them. Inclusion in anonymised research statistics is a separate, optional permission that is off by default. The current notice version is ${HEALTH_NOTICE_VERSION}.`
  },
  {
    q: "How do you know the guidance helps?",
    a: `We ask. ${FOLLOW_UP_DAYS} days after giving footwear guidance to someone logging pain, the app asks two questions: did you change your footwear, and is the pain better. The answers are aggregated and reported with their response rate, and rates are suppressed entirely until there are enough replies for a percentage to mean anything. It is self-reported and uncontrolled, and we say so wherever the numbers appear.`
  }
];

export default function FootHealthPage() {
  return (
    <div className="container-app py-10">
      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Foot health", path: "/foot-health" }
      ])} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <HeartPulse size={14} /> Foot health
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Footwear is a health decision. We treat it as one.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Most people in India buy shoes by eye, in a size system that varies between
          brands, without ever having measured their feet. When the fit is wrong the
          consequences are ordinary — blisters, heel pain, a pair that never gets worn.
          For people with diabetes and reduced sensation in the feet, the same wrong fit
          can end somewhere much worse, because the damage is not felt while it is
          happening.
        </p>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">
          {SITE.name} exists at that junction: measure the foot properly, be honest
          about the error bars, and know when to stop being a shopping site.
        </p>
      </div>

      {/* the method, in the order it actually runs */}
      <div className="mx-auto mt-12 max-w-4xl">
        <h2 className="text-xl font-black text-slate-900">What the tool actually does</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Step
            icon={Ruler}
            n="1"
            title="Measure, with the error stated"
            body="A photo against a reference object of known size, corrected for the angle the phone was held at, gives a foot length in millimetres. The result carries its confidence, and below a threshold we decline to name a size rather than guess. Anyone can override it with their own tape measurement."
          />
          <Step
            icon={ClipboardCheck}
            n="2"
            title="Log what the feet are doing"
            body="Steps, distance, activity, and where it hurts — with three symptoms asked separately because they change the answer entirely: numbness, a wound that is not healing, and swelling. Nothing is stored without recorded consent."
          />
          <Step
            icon={AlertTriangle}
            n="3"
            title="Screen, and refer"
            body="Any red flag makes the summary urgent: the footwear guidance is withheld and referral guidance takes its place, with a specific prompt to ask for a foot examination if the person has diabetes. Answering a possible ulcer with a product recommendation is the most harmful thing a tool like this could do."
            accent
          />
          <Step
            icon={Stethoscope}
            n="4"
            title="Suggest features, not treatments"
            body="Where there is no red flag, the summary names footwear features associated with comfort for that pattern — arch support, cushioning, a wider toe box — and, for each one, the point at which it stops being a footwear question and deserves a clinician's opinion."
          />
        </div>
      </div>

      {/* the outcome loop — the part most tools skip */}
      <div className="mx-auto mt-12 max-w-4xl rounded-2xl bg-indigo-50 p-6 ring-1 ring-indigo-200 md:p-8">
        <h2 className="flex items-center gap-2 text-xl font-black text-indigo-900">
          <LineChart size={20} /> And then we check whether it worked
        </h2>
        <p className="mt-3 leading-relaxed text-indigo-900">
          {FOLLOW_UP_DAYS} days after giving someone guidance for logged pain, the app
          asks two questions: did you change your footwear, and is the pain better. That
          is the entire follow-up — every extra question costs replies, and a follow-up
          nobody answers measures nothing.
        </p>
        <p className="mt-3 leading-relaxed text-indigo-900">
          The comparison we care about is not how many people improved, but how many of
          those who acted on the guidance improved against those who did not. We report
          the response rate beside it, count people who decline to answer as their own
          category, and publish no percentage at all until the sample is large enough
          for one to be meaningful. It is self-reported, unblinded and uncontrolled
          evidence. It is also more than a shopping site can tell you.
        </p>
      </div>

      {/* the data gap */}
      <div className="mx-auto mt-12 max-w-4xl">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <Users size={20} className="text-indigo-600" /> The measurement gap this creates
        </h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          Footwear sold in India is largely built on lasts derived from Western foot
          shapes, and there is very little published data describing how Indian feet
          actually differ — by region, by age, by how wide they run relative to length.
          We are not going to assert a figure we cannot cite. What we can do is measure,
          with consent, and let the dataset accumulate: foot dimensions with a state and
          an age band, no name, no email, no exact location, and only from people who
          separately opted in.
        </p>
        <p className="mt-3 leading-relaxed text-slate-600">
          State-level figures stay hidden until at least five people have contributed,
          because an average over two people is not a statistic and could identify them.
          If that dataset becomes worth anything, the people who built it are the ones
          who agreed to it — which is the reason the consent is separate in the first
          place.
        </p>
      </div>

      {/* limits, stated plainly and before anyone asks */}
      <div className="mx-auto mt-12 max-w-4xl rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200 md:p-8">
        <h2 className="flex items-center gap-2 text-xl font-black text-amber-900">
          <AlertTriangle size={20} /> What this is not
        </h2>
        <p className="mt-3 leading-relaxed text-amber-900">{MEDICAL_DISCLAIMER}</p>
        <ul className="mt-4 space-y-2 text-sm text-amber-900">
          <li>· Not registered as a medical device, and it makes no diagnostic claim.</li>
          <li>· Not clinically validated — no trial has been run, and no clinician reviews individual results.</li>
          <li>· Not a substitute for a foot examination, particularly in diabetes.</li>
          <li>· Not a replacement for trying shoes on; a millimetre-accurate size is a better starting point, not a guarantee.</li>
        </ul>
      </div>

      <div className="mx-auto mt-12 max-w-4xl">
        <h2 className="text-xl font-black text-slate-900">Questions people ask</h2>
        <div className="mt-4 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card group p-5" open>
              <summary className="cursor-pointer font-bold text-slate-900">{f.q}</summary>
              <p className="mt-2 leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center gap-3 rounded-2xl bg-slate-900 p-6 md:p-8">
        <div className="min-w-[240px] flex-1">
          <p className="text-lg font-black text-white">Start with your actual measurements</p>
          <p className="mt-1 text-sm text-slate-300">
            Two minutes, and you can enter your own numbers instead if you prefer.
          </p>
        </div>
        <Link href="/foot-scan" className="btn-primary">
          Measure my feet <ArrowRight size={16} />
        </Link>
        <Link href="/health" className="btn-ghost bg-white/10 text-white hover:bg-white/20">
          Foot health log
        </Link>
      </div>

      <p className="mx-auto mt-8 max-w-4xl text-xs text-slate-500">
        Read the full{" "}
        <Link href="/data-and-privacy" className="font-semibold text-brand-600 hover:underline">
          data &amp; privacy notice
        </Link>{" "}
        for what is collected, why, and how to delete it. Operated by TriMalv Pvt Ltd.
      </p>
    </div>
  );
}

function Step({
  icon: Icon,
  n,
  title,
  body,
  accent
}: {
  icon: typeof Ruler;
  n: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "ring-2 ring-rose-200" : ""}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            accent ? "bg-rose-100 text-rose-700" : "bg-indigo-50 text-indigo-600"
          }`}
        >
          <Icon size={18} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Step {n}
        </span>
      </div>
      <p className="mt-3 font-black text-slate-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
