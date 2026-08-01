import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Close any open reset request for an address, without touching the password.
 *
 * The dashboard's Dismiss button works by request id, which is fine for a person
 * clicking it. This exists for the sanity suite, which raises a request for an
 * address that never existed and must not leave it behind: the reset queue is
 * only useful while it is short enough for a human to work through, and a
 * permanent fake entry sitting at the top of it is how that stops being true.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const email = String((await req.json().catch(() => ({}) as any)).email || "")
    .trim()
    .toLowerCase();
  if (!email) return NextResponse.json({ error: "Which address?" }, { status: 400 });

  const { count } = await prisma.passwordResetRequest.updateMany({
    where: { email, status: "open" },
    data: { status: "dismissed", handledAt: new Date() }
  });
  return NextResponse.json({ ok: true, dismissed: count });
}
