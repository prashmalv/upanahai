import { NextRequest, NextResponse } from "next/server";
import { getSession, readVisitorId } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

/**
 * Outbound click tracker / redirect. Records intent-to-buy before handing the
 * shopper to the retailer — the closest thing this platform has to a conversion
 * signal, so it feeds the admin funnel.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const pid = req.nextUrl.searchParams.get("pid");
  const retailer = req.nextUrl.searchParams.get("r");

  // Absolute http(s) only: anything else (javascript:, data:, //host) would
  // turn this endpoint into an open redirect.
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const session = await getSession();
  await logEvent({
    type: "buy_click",
    path: "/api/go",
    userId: session?.userId ?? null,
    visitorId: readVisitorId(),
    meta: `product=${pid || ""};retailer=${retailer || ""}`
  });

  return NextResponse.redirect(url);
}
