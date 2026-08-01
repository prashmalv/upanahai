import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Readable at a glance and awkward to mistype: no I/l/1/O/0. */
function tempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 14; i++) out += alphabet[randomInt(alphabet.length)];
  return `Upanah-${out}`;
}

/**
 * Reset a user's password, as the admin, and hand back a temporary one.
 *
 * The plain password is returned exactly once, in this response, and stored
 * nowhere — the database gets the bcrypt hash like any other password. The
 * account is flagged so the person is made to change it at their next sign-in,
 * because a temporary password passed along over WhatsApp otherwise becomes
 * their permanent one.
 *
 * Admins cannot reset another admin this way. Whoever holds an admin session
 * could otherwise take over a co-admin's account and leave them locked out, and
 * that is a decision for a database, not a dashboard button.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { email, requestId, action } = await req.json().catch(() => ({}) as any);

  // Dismissing a request needs no password work — a typo'd address, or somebody
  // who got back in on their own.
  if (action === "dismiss" && requestId) {
    await prisma.passwordResetRequest.update({
      where: { id: String(requestId) },
      data: { status: "dismissed", handledAt: new Date() }
    });
    return NextResponse.json({ ok: true, dismissed: true });
  }

  const target = await prisma.user.findUnique({
    where: { email: String(email || "").trim().toLowerCase() },
    select: { id: true, email: true, role: true }
  });
  if (!target) {
    return NextResponse.json({ error: "No account with that address" }, { status: 404 });
  }
  if (target.role === "admin") {
    // No admin resets from the dashboard, including your own. Resetting a
    // co-admin would let whoever holds this session lock them out; resetting
    // yourself is a footgun with nothing behind it — you are already signed in,
    // so the change-password form does the job without minting a temporary
    // password and sending you round the loop. An admin genuinely locked out
    // needs a hand at the database, which is the right amount of friction.
    return NextResponse.json(
      {
        error:
          target.id === session.userId
            ? "You're signed in — change your own password from your account page."
            : "Another admin's password can't be reset from here."
      },
      { status: 403 }
    );
  }

  const password = tempPassword();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }
    }),
    prisma.passwordResetRequest.updateMany({
      where: { email: target.email, status: "open" },
      data: { status: "done", handledAt: new Date() }
    })
  ]);

  return NextResponse.json({
    ok: true,
    email: target.email,
    // Shown once. Not stored, not logged, not recoverable — a second reset is the
    // only way back if it is lost, which is the correct trade.
    password
  });
}
