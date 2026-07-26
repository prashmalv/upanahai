import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, ensureVisitorId, type Role } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const normalisedEmail = String(email || "").trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });
  // Identical response for "no such account" and "wrong password", so this
  // endpoint can't be used to discover which emails are registered.
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const role = (user.role || "user") as Role;
  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role,
    brandName: user.brandName || undefined
  });

  const visitorId = ensureVisitorId();
  await logEvent({ type: "login", userId: user.id, visitorId });

  return NextResponse.json({ ok: true, role });
}
