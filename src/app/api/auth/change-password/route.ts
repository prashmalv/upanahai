import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession, createSession, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both passwords are required" }, { status: 400 });
  }
  if (String(newPassword).length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD} characters` },
      { status: 400 }
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Always re-verify the current password: a valid session alone must not be
  // enough to change credentials (protects against a borrowed/stolen session).
  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    // Clearing the flag here is the whole point of it: choosing your own password
    // is exactly what it was waiting for.
    data: {
      passwordHash: await bcrypt.hash(String(newPassword), 10),
      mustChangePassword: false
    }
  });

  // Re-issue the cookie so the session doesn't outlive the old password.
  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: (user.role || "user") as Role,
    brandName: user.brandName || undefined
  });

  return NextResponse.json({ ok: true });
}
