import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Delete the signed-in user's account and everything attached to it.
 *
 * WHY THIS EXISTS AS AN ENDPOINT
 *
 * /data-and-privacy tells people they have the right to erasure under the DPDP
 * Act and then asks them to email us for it. A right that depends on someone
 * reading their inbox is a right on paper. This makes it a button.
 *
 * WHAT GOES
 *
 * Everything, including the questions and answers the person posted publicly.
 * Keeping those would mean keeping content authored by an account we just told
 * someone we had deleted, and the schema ties them to the user by design. The
 * cost is real — a thread loses an answer someone else may have relied on — and
 * the account page says so before the click rather than after.
 *
 * The confirmation string is required so that a stray fetch, a prefetch, or a
 * mis-wired button cannot delete somebody's account.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { confirm } = await req.json().catch(() => ({}) as { confirm?: string });
  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Send {"confirm":"DELETE"} to confirm. Nothing was deleted.' },
      { status: 400 }
    );
  }

  const userId = session.userId;

  // Ordered so nothing is orphaned even where the schema would not cascade.
  await prisma.$transaction([
    prisma.answer.deleteMany({ where: { userId } }),
    prisma.question.deleteMany({ where: { userId } }),
    prisma.brandFeedback.deleteMany({ where: { userId } }),
    prisma.feedback.deleteMany({ where: { userId } }),
    prisma.careEpisode.deleteMany({ where: { userId } }),
    prisma.healthLog.deleteMany({ where: { userId } }),
    prisma.footProfile.deleteMany({ where: { userId } }),
    prisma.wishlist.deleteMany({ where: { userId } }),
    // Analytics rows are detached rather than deleted: a page view with no user
    // attached is not personal data, and removing the counts would quietly rewrite
    // history for everyone else's totals.
    prisma.searchLog.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.event.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.delete({ where: { id: userId } })
  ]);

  clearSession();
  return NextResponse.json({ ok: true, deleted: true });
}
