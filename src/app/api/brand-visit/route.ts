import { NextRequest, NextResponse } from "next/server";
import { getSession, readVisitorId } from "@/lib/auth";
import { logEvent } from "@/lib/track";
import { brandBySlug } from "@/lib/brandDirectory";

export const dynamic = "force-dynamic";

/**
 * Outbound redirect to a brand's own store, counted as a lead.
 *
 * The destination is looked up from our own directory by slug rather than taken
 * from the query string. That makes an open redirect structurally impossible —
 * there is no user-supplied URL to sanitise — and it guarantees the recorded
 * brand and the visited site can never disagree, which matters if a brand ever
 * asks us to account for the leads we claim to have sent them.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("b") || "";
  const from = req.nextUrl.searchParams.get("from") || "";

  const brand = brandBySlug(slug);
  if (!brand) {
    return NextResponse.json({ error: "Unknown brand" }, { status: 404 });
  }

  const session = await getSession();
  await logEvent({
    type: "brand_visit",
    path: "/api/brand-visit",
    userId: session?.userId ?? null,
    visitorId: readVisitorId(),
    meta: `brand=${brand.name};from=${from.slice(0, 40)}`
  });

  return NextResponse.redirect(brand.url);
}
