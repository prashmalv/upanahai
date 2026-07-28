import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { HEALTH_NOTICE_VERSION } from "@/lib/footHealth";

export const dynamic = "force-dynamic";

/**
 * Records — and withdraws — consent for health data.
 *
 * Two separate permissions, deliberately not bundled:
 *
 *   health   — collect foot measurements, pain and activity logs at all
 *   research — additionally include those measurements in anonymised aggregate
 *              statistics
 *
 * Consent that is a precondition for using the feature at all isn't freely given,
 * so `research` defaults to off and refusing it costs the user nothing.
 *
 * Withdrawal deletes the data rather than just clearing a flag. A flag that hides
 * data we still hold is not withdrawal, and under the DPDP Act erasure on
 * withdrawal is the expectation, not a courtesy.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { health, research, diabetes } = await req.json().catch(() => ({}) as any);
  const now = new Date();

  if (health === false) {
    // Withdrawing health consent removes what it authorised us to hold.
    await prisma.$transaction([
      prisma.healthLog.deleteMany({ where: { userId: session.userId } }),
      prisma.footProfile.deleteMany({ where: { userId: session.userId } }),
      // Care episodes hold a pain baseline and a self-reported outcome, so they
      // are health data too and go with the rest. It costs us the research
      // signal for this person, which is the correct trade.
      prisma.careEpisode.deleteMany({ where: { userId: session.userId } }),
      prisma.user.update({
        where: { id: session.userId },
        data: {
          healthConsentAt: null,
          healthConsentVersion: "",
          researchConsent: false,
          researchConsentAt: null,
          // A health condition someone told us about is health data too.
          diabetesDeclared: false
        }
      })
    ]);
    return NextResponse.json({ ok: true, health: false, research: false, deleted: true });
  }

  const data: Record<string, unknown> = {};
  if (health === true) {
    data.healthConsentAt = now;
    data.healthConsentVersion = HEALTH_NOTICE_VERSION;
  }
  if (typeof diabetes === "boolean") {
    data.diabetesDeclared = diabetes;
  }
  if (typeof research === "boolean") {
    data.researchConsent = research;
    data.researchConsentAt = research ? now : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: session.userId }, data });
  return NextResponse.json({
    ok: true,
    health: !!user.healthConsentAt,
    research: user.researchConsent,
    diabetes: user.diabetesDeclared,
    version: user.healthConsentVersion
  });
}

/** Current consent state, so the UI never guesses. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      healthConsentAt: true,
      healthConsentVersion: true,
      researchConsent: true,
      diabetesDeclared: true
    }
  });
  return NextResponse.json({
    health: !!user?.healthConsentAt,
    research: !!user?.researchConsent,
    diabetes: !!user?.diabetesDeclared,
    version: user?.healthConsentVersion || "",
    currentVersion: HEALTH_NOTICE_VERSION,
    /** true when the notice changed since they agreed — re-consent needed. */
    stale: !!user?.healthConsentAt && user.healthConsentVersion !== HEALTH_NOTICE_VERSION
  });
}
