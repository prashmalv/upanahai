"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Records one page_view per route change so the admin dashboard can report
 * reach. Mounted once in the root layout.
 *
 * Deliberately skips /admin: the operator browsing their own dashboard
 * shouldn't inflate the numbers they're reading.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    // React strict mode double-invokes effects in dev; don't double count.
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const body = JSON.stringify({
      type: "page_view",
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : ""
    });

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {
      /* analytics must never surface an error to the shopper */
    });
  }, [pathname]);

  return null;
}
