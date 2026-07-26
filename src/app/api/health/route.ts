import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ logs: [] });
  const logs = await prisma.healthLog.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    take: 30
  });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { steps, distanceKm, activity, painArea } = await req.json();
  const log = await prisma.healthLog.create({
    data: {
      userId: session.userId,
      steps: Number(steps) || 0,
      distanceKm: Number(distanceKm) || 0,
      activity: activity || "walk",
      painArea: painArea || ""
    }
  });
  return NextResponse.json({ ok: true, log });
}
