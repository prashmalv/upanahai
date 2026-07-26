/**
 * Idempotently provisions the admin account. Runs on every boot from
 * startup.sh, which is why it must never clobber an existing password:
 *
 *  - account missing  -> create it with ADMIN_INITIAL_PASSWORD
 *  - account present  -> only ensure role === "admin", leave the password alone
 *
 * Admin is granted here and nowhere else; /api/auth/signup deliberately cannot
 * mint one.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "prashant.malviya@upanah.com")
  .trim()
  .toLowerCase();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin" }
      });
      console.log(`[admin] promoted ${ADMIN_EMAIL} to admin`);
    } else {
      console.log(`[admin] ${ADMIN_EMAIL} already an admin — password untouched`);
    }
    return;
  }

  const initial = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initial || initial.length < 8) {
    console.error(
      "[admin] ADMIN_INITIAL_PASSWORD is missing or too short — " +
        `cannot create ${ADMIN_EMAIL}. Set it in app settings and restart.`
    );
    return;
  }

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Prashant Malviya",
      passwordHash: await bcrypt.hash(initial, 10),
      role: "admin",
      persona: "general",
      country: "IN"
    }
  });
  console.log(`[admin] created ${ADMIN_EMAIL} — change the password after first sign-in`);
}

main()
  .catch((e) => {
    console.error("[admin] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
