import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * "I've forgotten my password."
 *
 * There is no email-based reset yet, so this records the request for the admin to
 * act on. Interim by design, and honest about it on the page: the person is told a
 * human will reset it, not that a link is on its way.
 *
 * THE ONE SECURITY RULE HERE
 *
 * The response is identical whether or not the address has an account. Anything
 * else turns this endpoint into a way to test which email addresses are
 * registered, which is worth more to someone probing the site than the reset
 * itself. Requests for unknown addresses are still stored — a typo at signup looks
 * exactly like this, and the admin can only spot that if they can see it.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as any);
  const email = String(body.email || "").trim().toLowerCase();
  const note = String(body.note || "").trim().slice(0, 300);

  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (!looksLikeEmail) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // One open request per address. Asking five times should not produce five rows
  // for the admin to wade through; it should update the one that is already there.
  await prisma.passwordResetRequest.upsert({
    where: { email_status: { email, status: "open" } },
    update: { note, userId: user?.id ?? null, createdAt: new Date() },
    create: { email, note, userId: user?.id ?? null, status: "open" }
  });

  return NextResponse.json({
    ok: true,
    message:
      "Request received. Password resets are done by hand right now, so someone " +
      "will get back to you at this address. If you don't hear back, the address " +
      "may not have an account on it."
  });
}
