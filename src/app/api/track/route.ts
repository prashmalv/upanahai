import { NextRequest, NextResponse } from "next/server";
import { getSession, ensureVisitorId } from "@/lib/auth";
import { logEvent, type EventType } from "@/lib/track";

export const dynamic = "force-dynamic";

// Only these can be written from the browser. Without an allow-list anyone
// could POST fake "signup"/"buy_click" rows and corrupt the admin reports.
const CLIENT_ALLOWED: EventType[] = ["page_view", "foot_scan", "photo_match", "try_on"];

export async function POST(req: NextRequest) {
  const { type, path, meta, referrer } = await req.json().catch(() => ({} as any));

  if (!CLIENT_ALLOWED.includes(type)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const session = await getSession();
  const visitorId = ensureVisitorId();

  await logEvent({
    type,
    path: String(path || ""),
    userId: session?.userId ?? null,
    visitorId,
    meta: String(meta || ""),
    referrer: String(referrer || "")
  });

  return NextResponse.json({ ok: true });
}
