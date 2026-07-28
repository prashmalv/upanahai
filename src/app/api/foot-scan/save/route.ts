import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPlausibleFoot } from "@/lib/fit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // A saved foot measurement is health data, so the same recorded consent applies
  // as to the activity log — gating one and not the other would be incoherent.
  const consent = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { healthConsentAt: true }
  });
  if (!consent?.healthConsentAt) {
    return NextResponse.json(
      {
        error:
          "Saving your measurements needs your consent first — you can give it on the health page.",
        needsConsent: true
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { lengthMm, widthMm, archType, sizes, sizeIsReliable } = body;

  if (!sizes || !isPlausibleFoot(Number(lengthMm))) {
    return NextResponse.json({ error: "Nothing measurable to save." }, { status: 400 });
  }

  // A low-confidence reading must not become the profile that silently drives
  // every future recommendation — that's how one bad photo becomes months of
  // wrong sizes.
  if (sizeIsReliable === false) {
    return NextResponse.json(
      {
        error:
          "That reading wasn't confident enough to save. Re-measure with the precise " +
          "mode, or enter your own measurement."
      },
      { status: 422 }
    );
  }

  await prisma.footProfile.upsert({
    where: { userId: session.userId },
    update: {
      lengthMm, widthMm, archType,
      ukSize: sizes.uk, euSize: sizes.eu, usSize: sizes.us,
      widthCategory: sizes.widthCategory
    },
    create: {
      userId: session.userId,
      lengthMm, widthMm, archType,
      ukSize: sizes.uk, euSize: sizes.eu, usSize: sizes.us,
      widthCategory: sizes.widthCategory
    }
  });

  return NextResponse.json({ ok: true });
}
