import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/seo";


export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-100 bg-white">
      <div className="container-app grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/upanah-mark.png"
              alt={`${SITE.name} logo`}
              width={256}
              height={256}
              className="h-10 w-10 rounded-xl"
            />
            <div className="leading-none">
              <p className="text-lg font-extrabold text-slate-900">
                Upanah<span className="text-brand-600">.AI</span>
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {SITE.tagline}
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            India&apos;s first AI footwear platform — compare branded shoes by price,
            rating and real fit, then buy from the retailer you trust.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">Discover</p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/search?category=running" className="hover:text-brand-600">Running</Link></li>
            <li><Link href="/search?category=sports" className="hover:text-brand-600">Sports</Link></li>
            <li><Link href="/search?category=orthopedic" className="hover:text-brand-600">Comfort / Senior</Link></li>
            <li><Link href="/search?gender=kids" className="hover:text-brand-600">Kids</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">Tools</p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/foot-scan" className="hover:text-brand-600">Foot Fit Scan</Link></li>
            <li><Link href="/size-chart" className="hover:text-brand-600">Size chart</Link></li>
            <li><Link href="/try-on" className="hover:text-brand-600">Virtual Try-On</Link></li>
            <li><Link href="/match" className="hover:text-brand-600">Find by Photo</Link></li>
            <li><Link href="/health" className="hover:text-brand-600">Health Tracker</Link></li>
            <li><Link href="/foot-health" className="hover:text-brand-600">Foot health &amp; our limits</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">Community</p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/trends" className="hover:text-brand-600">What India is searching for</Link></li>
            <li><Link href="/brands" className="hover:text-brand-600">Brand ratings</Link></li>
            <li><Link href="/community" className="hover:text-brand-600">Ask the community</Link></li>
            <li><Link href="/community?kind=advice" className="hover:text-brand-600">Should I buy it?</Link></li>
            <li><Link href="/login" className="hover:text-brand-600">Sign in / Register</Link></li>
            <li><Link href="/data-and-privacy" className="hover:text-brand-600">Data &amp; privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs leading-relaxed text-slate-400">
        <p>
          © {new Date().getFullYear()} {SITE.name} · {SITE.tagline} · Made in India 🇮🇳
        </p>
        <p className="mt-1.5">
          This is a branded site of{" "}
          <span className="font-semibold text-slate-600">TriMalv Pvt Ltd</span>.
        </p>
        <p className="mt-1.5">
          We link you to retailers; prices &amp; availability may vary. Brand ratings
          are shopper-submitted and independent of any retailer or brand.
        </p>
      </div>
    </footer>
  );
}
