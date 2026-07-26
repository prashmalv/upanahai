import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, ensureVisitorId, type Role } from "@/lib/auth";
import { logEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

export async function POST(req: NextRequest) {
  const { email, password, name, persona, city, state, accountType, brandName } =
    await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (String(password).length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters` },
      { status: 400 }
    );
  }
  const normalisedEmail = String(email).trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
  if (existing) return NextResponse.json({ error: "Account already exists" }, { status: 409 });

  // Self-signup can never mint an admin — that role is granted server-side only
  // (prisma/seed.ts), so a crafted request can't escalate.
  const role: Role = accountType === "brand" ? "brand" : "user";

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: normalisedEmail,
      passwordHash,
      name: name?.trim() || null,
      persona: persona || "general",
      role,
      brandName: role === "brand" ? String(brandName || "").trim() : "",
      city: String(city || "").trim(),
      state: String(state || "").trim(),
      lastLoginAt: new Date()
    }
  });

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role,
    brandName: user.brandName || undefined
  });

  const visitorId = ensureVisitorId();
  await logEvent({ type: "signup", userId: user.id, visitorId, meta: user.state });

  return NextResponse.json({ ok: true, role });
}
