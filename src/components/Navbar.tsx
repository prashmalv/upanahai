import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/seo";
import {
  Heart, ScanLine, User2, Activity, Star, MessageSquare, ShieldCheck, Ruler,
  TrendingUp, Users
} from "lucide-react";

export async function Navbar() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SITE.name} home`}>
          <Image
            src="/brand/upanah-mark.png"
            alt={`${SITE.name} logo`}
            width={256}
            height={256}
            priority
            className="h-10 w-10 rounded-xl shadow-soft"
          />
          <span className="leading-none">
            <span className="block text-lg font-extrabold tracking-tight text-slate-900">
              Upanah<span className="text-brand-600">.AI</span>
            </span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
              {SITE.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {/* One idea per item. This used to read "Running · Women · Kids" — a shoe
              type sitting beside two audiences, so the row asked the visitor to
              switch categories mid-sentence. Three audiences, and the types live
              on the search page's own filters. */}
          <Link href="/search?gender=men" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Men</Link>
          <Link href="/search?gender=women" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Women</Link>
          <Link href="/search?gender=kids" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Kids</Link>
          <Link href="/foot-scan" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><ScanLine size={15} /> Fit Scan</Link>
          <Link href="/size-chart" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><Ruler size={15} /> Size chart</Link>
          <Link href="/brands" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><Star size={15} /> Brands</Link>
          <Link href="/trends" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><TrendingUp size={15} /> Trends</Link>
          <Link href="/survey" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><Users size={15} /> Survey</Link>
          <Link href="/community" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><MessageSquare size={15} /> Community</Link>
          <Link href="/health" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><Activity size={15} /> Health</Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/wishlist" className="btn-ghost hidden sm:inline-flex" aria-label="Wishlist">
            <Heart size={16} /> Wishlist
          </Link>
          {session?.role === "admin" && (
            <Link href="/admin" className="btn-ghost hidden md:inline-flex" title="Admin analytics">
              <ShieldCheck size={16} /> Admin
            </Link>
          )}
          {session ? (
            <Link href="/account" className="btn-primary">
              <User2 size={16} /> {session.name?.split(" ")[0] || "Account"}
            </Link>
          ) : (
            <Link href="/login" className="btn-primary">
              <User2 size={16} /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
