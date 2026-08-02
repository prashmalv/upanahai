import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE, breadcrumbJsonLd } from "@/lib/seo";
import { HEALTH_NOTICE_VERSION, MEDICAL_DISCLAIMER } from "@/lib/footHealth";
import { ShieldCheck, AlertTriangle, Database, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data, Privacy & What This Tool Is Not",
  description:
    "What Upanah.AI collects, why, how long we keep it, and how to delete it. Includes our position on health data, anonymised research use, and a plain statement that this is a wellness tool and not a medical device.",
  alternates: { canonical: "/data-and-privacy" }
};

export default function DataAndPrivacyPage() {
  return (
    <div className="container-app py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Data & privacy", path: "/data-and-privacy" }
        ])}
      />

      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <ShieldCheck size={14} /> Data &amp; privacy
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          What we collect, and what this tool is not
        </h1>
        <p className="mt-3 text-slate-600">
          Notice version {HEALTH_NOTICE_VERSION}. Written to be read, not to be
          survived.
        </p>

        {/* The most important thing on the page goes first. */}
        <section className="mt-8 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <h2 className="flex items-center gap-2 text-lg font-black text-amber-900">
            <AlertTriangle size={18} /> This is not a medical device
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">{MEDICAL_DISCLAIMER}</p>
          <p className="mt-3 text-sm leading-relaxed text-amber-900">
            Concretely: we do not diagnose flat feet, plantar fasciitis, diabetic
            neuropathy or anything else. Where your log suggests something that needs
            a clinician — numbness, a wound that isn&apos;t healing, new swelling — we
            withhold footwear suggestions and say so, because a shoe recommendation
            would be the wrong answer to those.
          </p>
        </section>

        <Section icon={Database} title="What we collect, and why">
          <Table
            rows={[
              ["Email, name, password hash", "To have an account at all. Passwords are hashed with bcrypt — we cannot read yours.", "Until you delete the account"],
              ["City and state", "Chosen by you at signup. Used for aggregate reporting on where interest comes from.", "Until you delete the account"],
              ["Foot measurements — length, width, arch type", "To convert to a size and to personalise footwear guidance. Health data: only stored after you consent.", "Until you withdraw consent"],
              ["Activity and symptom log", "Steps, distance, where it hurts, and the red-flag questions. Health data: only after consent.", "Until you withdraw consent"],
              ["Whether you have told us you have diabetes", "Optional, and only because it changes the advice: it lowers the point at which we stop suggesting footwear and suggest a foot examination instead. Never shared, never used for targeting.", "Until you untick it or withdraw consent"],
              ["Four-week follow-up answers", "Whether you changed your footwear and whether the pain improved. Aggregated to check our guidance is worth anything.", "Until you withdraw consent"],
              ["Reviews, questions and answers you post", "They are public by design — that is the point of them.", "Until you ask us to remove them"],
              ["Page views and searches", "A first-party cookie gives an anonymous id so we can count people rather than requests. No third-party advertising or tracking pixels.", "Aggregated; raw rows pruned over time"],
              ["Clicks out to brands and retailers", "So we can tell a brand how many people we sent them.", "Aggregated"],
              ["Questions you ask Upanah Mitra", "The question and the answer, against an anonymous browser id rather than your name. We read them to find what the site should answer better. Don't type anything into it you wouldn't want us to read.", "Aggregated; raw questions pruned over time"]
            ]}
          />
          <p className="mt-4 text-sm text-slate-600">
            We do not run third-party advertising trackers, we do not sell personal
            data, and we do not pass your identity to brands or retailers. When you
            click through to a store, they see a normal visitor — not a profile
            from us.
          </p>
        </Section>

        <Section icon={UserCheck} title="Health data needs consent, separately">
          <p className="text-sm leading-relaxed text-slate-600">
            Foot measurements and symptom logs are health information, so we ask
            before storing any of it, and the app works without it. Two separate
            permissions:
          </p>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            <li>
              <strong className="text-slate-900">Health logging.</strong> Lets us store
              your measurements and log. Refuse it and everything else still works —
              search, size charts, brand ratings, the community. You just don&apos;t get
              the personal summary.
            </li>
            <li>
              <strong className="text-slate-900">Anonymised research use (optional).</strong>{" "}
              Lets us include your measurements in aggregate statistics about Indian
              foot dimensions — measurement, age band and state only, never your name,
              email or exact location. It is off by default and refusing it changes
              nothing else. We keep it separate precisely so that agreeing to use the
              tracker doesn&apos;t silently agree to this.
            </li>
          </ul>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <strong className="text-slate-900">Withdrawal deletes.</strong> Withdrawing
            health consent doesn&apos;t just flip a flag — it deletes your foot profile, your
            entire activity log, your follow-up records and any condition you told us
            about. We think a switch that hides data we still hold would be dishonest.
          </p>
        </Section>

        <Section icon={ShieldCheck} title="Your rights, and how to use them">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>· <strong>See it</strong> — your account page shows everything we hold about you.</li>
            <li>· <strong>Correct it</strong> — re-measure, edit your profile, or update a review at any time.</li>
            <li>· <strong>Delete it</strong> — withdraw health consent to erase health data, or delete the whole account from your <Link href="/account" className="font-semibold text-brand-600 hover:underline">account page</Link>. Deleting the account also removes the questions and answers you posted publicly; we say so before you confirm, not after.</li>
            <li>· <strong>Withdraw consent</strong> — one click on the <Link href="/health" className="font-semibold text-brand-600 hover:underline">health page</Link>, no explanation needed.</li>
            <li>· <strong>Ask a human</strong> — <a href="mailto:prashant.malviya@upanah.com" className="font-semibold text-brand-600 hover:underline">prashant.malviya@upanah.com</a>.</li>
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            These reflect the rights the Digital Personal Data Protection Act, 2023
            gives you as a Data Principal in India. If we ever fall short of them,
            write to the address above.
          </p>
        </Section>

        <Section icon={AlertTriangle} title="Where our accuracy actually stands">
          <p className="text-sm leading-relaxed text-slate-600">
            We would rather state our limits than imply precision we don&apos;t have:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>· One shoe size is 8.5 mm, so small measurement errors change the answer.</li>
            <li>· A tapped, perspective-corrected measurement is good to roughly ±3 mm.</li>
            <li>· A single-photo AI estimate is ±5 to ±14 mm depending on how confident the model is — and below a threshold we refuse to name a size at all rather than guess.</li>
            <li>· Sizing still varies between brands, which is why we show what real buyers report rather than trusting a chart alone.</li>
            <li>· None of this is clinically validated. We have run no trials and no clinician has reviewed individual results.</li>
          </ul>
        </Section>

        <Section icon={Database} title="Where the data lives">
          <p className="text-sm leading-relaxed text-slate-600">
            Hosted on Microsoft Azure. The application runs in the Central India
            region and the AI models we use are deployed in South India, so
            measurements and photos are processed within India. Photos you submit for
            a scan or a match are sent to that model to be analysed and are not
            retained as part of your profile.
          </p>
        </Section>

        <p className="mt-10 text-xs text-slate-500">
          Operated by TriMalv Pvt Ltd. If this notice changes materially we&apos;ll ask you
          to review it again rather than quietly update the date — the version you
          agreed to is recorded against your account.
        </p>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
        <Icon size={18} className="text-indigo-600" /> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({ rows }: { rows: string[][] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="p-3">What</th>
            <th className="p-3">Why</th>
            <th className="p-3">How long</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r[0]}>
              <td className="p-3 font-semibold text-slate-900">{r[0]}</td>
              <td className="p-3 text-slate-600">{r[1]}</td>
              <td className="p-3 whitespace-nowrap text-slate-500">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
