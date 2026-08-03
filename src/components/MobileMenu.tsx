"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, ScanLine, Ruler, Star, TrendingUp, Users, MessageSquare,
  Activity, Heart, ShieldCheck, Search
} from "lucide-react";

type Item = { href: string; label: string; icon?: typeof Search };

const SHOP: Item[] = [
  { href: "/search", label: "Search all footwear", icon: Search },
  { href: "/search?gender=men", label: "Men" },
  { href: "/search?gender=women", label: "Women" },
  { href: "/search?gender=kids", label: "Kids" }
];

const TOOLS: Item[] = [
  { href: "/foot-scan", label: "Find my size", icon: ScanLine },
  { href: "/size-chart", label: "Size charts", icon: Ruler },
  { href: "/brands", label: "Brands", icon: Star },
  { href: "/health", label: "Foot health", icon: Activity }
];

const MORE: Item[] = [
  { href: "/trends", label: "What India is searching for", icon: TrendingUp },
  { href: "/survey", label: "How India buys footwear", icon: Users },
  { href: "/community", label: "Ask the community", icon: MessageSquare },
  { href: "/wishlist", label: "My wishlist", icon: Heart }
];

/**
 * The menu on small screens.
 *
 * There wasn't one. The nav was `hidden lg:flex` with no hamburger behind it, so
 * on a phone the size finder, the size charts, the brand directory, the community
 * and the health pages had no route to them at all — on a site whose visitors are
 * mostly going to arrive on a phone.
 *
 * Grouped rather than a flat list of eleven links, because a flat list of eleven
 * links is a wall. Closes on navigation, on Escape, and on tapping outside; the
 * page behind it is locked while it is open so a scroll gesture aimed at the menu
 * doesn't move the page instead.
 *
 * The panel is portalled to document.body, and that is not tidiness. The header it
 * lives in carries `backdrop-blur`, and backdrop-filter establishes a containing
 * block for fixed-position descendants — so `fixed inset-0` resolved against the
 * header instead of the viewport and the drawer was 412x64: a white strip in the
 * header with the menu text spilling over the hero, no dimming, nothing tappable.
 * Every functional test passed while it looked completely broken, which is what a
 * screenshot is for.
 */
export function MobileMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  // Portals need a DOM, so nothing is portalled until after mount.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Closing happens here, on the pathname changing — not in the link's onClick.
  //
  // Closing in the click handler unmounts the anchor in the same tick, and the
  // client router never gets to push: the panel shut and the page stayed exactly
  // where it was. Every menu tap did nothing, which is a worse bug than having no
  // menu, because it looks like the whole site is broken.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Tapping a link that leads to the page you are already on does not change the
  // pathname, so nothing would close the panel. Defer to the next tick: the click
  // is fully handled first, then the panel goes.
  const closeSoon = () => setTimeout(() => setOpen(false), 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu size={22} />
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* The dimmed area. Labelled differently from the X so a screen reader
              does not announce two identical "Close menu" buttons. */}
          <button
            aria-label="Dismiss menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-black text-slate-900">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <Group title="Shop" items={SHOP} onPick={closeSoon} />
              <Group title="Get the fit right" items={TOOLS} onPick={closeSoon} />
              <Group title="More" items={MORE} onPick={closeSoon} />
              {isAdmin && (
                <Group
                  title="Admin"
                  items={[{ href: "/admin", label: "Analytics dashboard", icon: ShieldCheck }]}
                  onPick={closeSoon}
                />
              )}
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function Group({
  title,
  items,
  onPick
}: {
  title: string;
  items: Item[];
  /** Deferred by a tick so it can never interrupt the navigation it follows. */
  onPick: () => void;
}) {
  return (
    <div className="mb-3">
      <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <ul>
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                onClick={onPick}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50"
              >
                {Icon ? (
                  <Icon size={17} className="shrink-0 text-slate-400" />
                ) : (
                  <span className="w-[17px]" aria-hidden />
                )}
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
