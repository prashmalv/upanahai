import Link from "next/link";
import Image from "next/image";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { getFeatured, getByPersona } from "@/lib/products";
import { aiEnabled } from "@/lib/ai";
import {
  ScanLine, Camera, Sparkles, ShieldCheck, Activity,
  PersonStanding, Baby, Trophy, Footprints, ArrowRight, ChevronDown
} from "lucide-react";
import { CapabilityTiles } from "@/components/home/CapabilityTiles";
import { PulseStrip } from "@/components/home/PulseStrip";
import { JsonLd } from "@/components/JsonLd";
import { SITE, STEPS, FAQS, faqJsonLd, howToJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=2000";

const CATEGORIES = [
  { key: "running", label: "Running", icon: Footprints },
  { key: "walking", label: "Walking", icon: PersonStanding },
  { key: "sports", label: "Sports", icon: Trophy },
  { key: "casual", label: "Casual", icon: Sparkles },
  { key: "formal", label: "Formal", icon: ShieldCheck },
  { key: "orthopedic", label: "Comfort", icon: Activity }
];

export default async function HomePage() {
  const featured = await getFeatured(8);
  const seniorPicks = await getByPersona("senior", 4);
  const sportsPicks = await getByPersona("sports", 4);

  return (
    <div>
      <JsonLd
        data={[
          faqJsonLd(),
          howToJsonLd(),
          breadcrumbJsonLd([{ name: "Home", path: "/" }])
        ]}
      />

      {/* HERO */}
      <section className="relative flex h-[85vh] min-h-[560px] items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="AI-crafted footwear"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          {/* narrow screens: the horizontal gradient alone leaves the copy over the shoe */}
          <div className="absolute inset-0 bg-black/35 sm:hidden" />
        </div>

        <div className="container-app relative w-full text-white">
          <div className="animate-fade-in">
            {/* Badge row — the tagline sits here because the lower hero is bright artwork. */}
            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-block rounded-full bg-indigo-600 px-4 py-1 text-[10px] font-black uppercase tracking-widest shadow-xl">
                Winter Drop 2024
              </span>
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                <span lang="hi">{SITE.taglineHi}</span>
                <span aria-hidden className="text-indigo-400">·</span>
                <span>{SITE.tagline}</span>
              </span>
            </div>
            <h1 className="mb-8 text-[2.5rem] font-black leading-[0.9] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl">
              CRAFTED BY <br />
              <span className="text-indigo-500">INTELLIGENCE.</span>
            </h1>
            <p className="mb-12 max-w-xl text-lg font-medium text-gray-300 md:text-2xl">
              The world&apos;s most advanced AI footwear ecosystem. Real-time try-ons,
              precise sizing, and curated fits.
            </p>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <Link
                href="/search"
                className="rounded-3xl bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-2xl transition hover:bg-indigo-600 hover:text-white sm:px-10 sm:py-5"
              >
                Browse Market
              </Link>
              <Link
                href="#ai-stylist"
                className="rounded-3xl border border-white/20 bg-white/10 px-8 py-4 text-xs font-black uppercase tracking-widest text-white backdrop-blur-xl transition hover:bg-white/20 sm:px-10 sm:py-5"
              >
                AI Stylist Quiz
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* POSITIONING — India's first AI footwear platform */}
      <section className="border-b border-slate-100 bg-white">
        <div className="container-app py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                <span lang="hi">{SITE.taglineHi}</span>
                <span aria-hidden className="text-slate-300">·</span>
                <span>{SITE.tagline}</span>
              </p>

              <h2 className="mt-5 text-3xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                India&apos;s <span className="text-indigo-600">first</span> AI-powered
                footwear platform.
              </h2>

              {/* One sentence only. The definitional long-form copy lives in the FAQ
                  below and in llms.txt, so trimming here costs nothing for AEO. */}
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
                Not a store. Not another marketplace. Tell it what you need in your
                own words and it finds the right pair for your foot, your budget and
                your body — then shows you where it&apos;s cheapest.
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { n: "14+", l: "Brands" },
                  { n: "6", l: "Retailers compared" },
                  { n: "UK/EU/US", l: "Sizes mapped" },
                  { n: "₹0", l: "Cost to you" }
                ].map(({ n, l }) => (
                  <div key={l} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <dt className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      {n}
                    </dt>
                    <dd className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">
                      {l}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* HOW IT WORKS — visual stepper, also emitted as HowTo schema */}
              <ol className="mt-10 space-y-0">
                {STEPS.map((s, i) => (
                  <li key={s.name} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* connector */}
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[15px] top-8 h-full w-0.5 bg-gradient-to-b from-indigo-200 to-transparent"
                      />
                    )}
                    <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <div className="pt-1">
                      <h3 className="font-bold leading-tight text-slate-900">{s.name}</h3>
                      <p className="mt-1 text-sm leading-snug text-slate-600">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Capability tiles — each shows real output rather than describing it */}
            <CapabilityTiles />
          </div>
        </div>
      </section>

      {/* AI SEARCH + QUICK TOOLS */}
      <section id="ai-stylist" className="hero-gradient scroll-mt-16">
        <div className="container-app py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip mx-auto">
              <Sparkles size={13} /> {aiEnabled ? "Live AI engine" : "AI-ready · India first"}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Describe your need — get your <span className="text-brand-600">perfect fit</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Upanah.AI recommends the best branded shoes, compares price &amp; ratings
              across retailers, scans your foot for the right size, and lets you try
              them on virtually.
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <SearchBar large />
            </div>
          </div>

          {/* quick tools */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            <Link href="/foot-scan" className="card flex items-center gap-4 p-5 transition hover:-translate-y-1">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><ScanLine /></span>
              <div>
                <p className="font-semibold text-slate-900">Foot Fit Scan</p>
                <p className="text-sm text-slate-500">Detect your exact size</p>
              </div>
            </Link>
            <Link href="/match" className="card flex items-center gap-4 p-5 transition hover:-translate-y-1">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><Camera /></span>
              <div>
                <p className="font-semibold text-slate-900">Find by Photo</p>
                <p className="text-sm text-slate-500">Snap a shoe, buy it</p>
              </div>
            </Link>
            <Link href="/try-on" className="card flex items-center gap-4 p-5 transition hover:-translate-y-1">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><Sparkles /></span>
              <div>
                <p className="font-semibold text-slate-900">Virtual Try-On</p>
                <p className="text-sm text-slate-500">See it on you</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-app py-12">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/search?category=${key}`}
              className="card flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-1 hover:text-brand-600"
            >
              <Icon className="text-brand-600" />
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="container-app pb-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { href: "/search?gender=men", icon: PersonStanding, t: "Men", d: "Sport, formal & casual" },
            { href: "/search?gender=women", icon: Sparkles, t: "Women", d: "Style meets comfort" },
            { href: "/search?gender=kids", icon: Baby, t: "Kids", d: "School & play, easy-wear" },
            { href: "/search?persona=senior", icon: Activity, t: "Seniors & Sports", d: "Extra support & performance" }
          ].map(({ href, icon: Icon, t, d }) => (
            <Link key={t} href={href} className="card group flex items-center justify-between p-5 hover:-translate-y-1 transition">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500/10 text-accent-600"><Icon /></span>
                <div>
                  <p className="font-semibold text-slate-900">{t}</p>
                  <p className="text-xs text-slate-500">{d}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
            </Link>
          ))}
        </div>
      </section>

      {/* DEMAND BOARD / QUIZ — real demand data when we have it, the sizing quiz
          when we don't. Placed above the product rails because curiosity is what
          brings someone back, and because it argues for measuring first. */}
      <PulseStrip />

      {/* FEATURED */}
      <Section title="Top rated right now" subtitle="Highest rated across all retailers" href="/search">
        {featured.map((p) => <ProductCard key={p.id} p={p} />)}
      </Section>

      {/* SENIOR */}
      <Section title="Best for seniors" subtitle="Extra cushioning, grip & arch support" href="/search?persona=senior">
        {seniorPicks.map((p) => <ProductCard key={p.id} p={p} />)}
      </Section>

      {/* SPORTS */}
      <Section title="For sportspersons" subtitle="Performance picks for athletes" href="/search?persona=sports">
        {sportsPicks.map((p) => <ProductCard key={p.id} p={p} />)}
      </Section>

      {/* FAQ — visible answers, mirrored into FAQPage schema for search & answer engines */}
      <section className="container-app py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Questions people ask about Upanah.AI
          </h2>
          <p className="mt-2 text-slate-500">
            Straight answers about fit, pricing and how the AI actually works.
          </p>
          <div className="mt-8 divide-y divide-slate-100 border-y border-slate-100">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer items-start justify-between gap-4 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base">{q}</h3>
                  <ChevronDown
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400 transition group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 pr-8 leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* HEALTH BANNER */}
      <section className="container-app py-12">
        <div className="card overflow-hidden bg-gradient-to-r from-brand-600 to-brand-800 p-8 text-white md:p-12">
          <div className="max-w-2xl">
            <span className="chip bg-white/15 text-white ring-white/20"><Activity size={13} /> Health-aware</span>
            <h2 className="mt-3 text-2xl font-extrabold md:text-3xl">Shoes that adapt to how you move</h2>
            <p className="mt-2 text-brand-50">
              Track your daily walks, runs and any foot pain. Upanah.AI learns your
              routine and recommends footwear that gives you better balance, support
              and comfort — a genuine value-add for every stage of life.
            </p>
            <Link href="/health" className="btn-accent mt-5">
              Start health tracking <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({
  title, subtitle, href, children
}: {
  title: string; subtitle: string; href: string; children: React.ReactNode;
}) {
  return (
    <section className="container-app py-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <Link href={href} className="text-sm font-semibold text-brand-600 hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{children}</div>
    </section>
  );
}
