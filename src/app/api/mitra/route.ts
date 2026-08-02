import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, readVisitorId } from "@/lib/auth";
import { isOurOwnTraffic } from "@/lib/track";
import { askMitra, ROUTES, OFF_TOPIC, MITRA_NAME } from "@/lib/mitra";

export const dynamic = "force-dynamic";

/**
 * Ask Upanah Mitra.
 *
 * The refusal is applied here rather than trusted to the model. `askMitra`
 * returns the model's own onTopic verdict; this route is what actually withholds
 * the answer, so a jailbroken prompt still cannot get an off-topic reply out —
 * the text never leaves the server.
 *
 * Off-topic questions are still recorded, without an answer. What people expect
 * a footwear assistant to know is worth more to us than a clean-looking table.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as any);
  const question = String(body.question ?? "").trim().slice(0, 500);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  if (question.length < 2) {
    return NextResponse.json({ error: "Ask me something about footwear." }, { status: 400 });
  }

  const { reply, usedAI } = await askMitra(question, history);

  const answer = reply.onTopic ? reply.answer : OFF_TOPIC;
  const links = reply.routes.map((k) => ({ ...ROUTES[k], key: k }));

  // A search deep-link, built here from the model's suggested query so the URL is
  // ours rather than something the model typed.
  const searchHref = reply.searchQuery
    ? `/search?q=${encodeURIComponent(reply.searchQuery)}`
    : "";

  if (!isOurOwnTraffic()) {
    const session = await getSession();
    await prisma.mitraTurn
      .create({
        data: {
          question,
          answer,
          onTopic: reply.onTopic,
          usedAI,
          healthFlag: reply.healthFlag,
          routes: reply.routes.join(","),
          category: reply.signal.category,
          brand: reply.signal.brand,
          audience: reply.signal.audience,
          need: reply.signal.need,
          maxPrice: reply.signal.maxPrice,
          visitorId: readVisitorId(),
          userId: session?.userId ?? null
        }
      })
      // Analytics must never break the answer. Same contract as the rest of the
      // tracking: log it and carry on.
      .catch((e) => console.error("[mitra] could not record turn:", (e as Error).message));
  }

  return NextResponse.json({
    name: MITRA_NAME,
    onTopic: reply.onTopic,
    answer,
    links,
    searchHref,
    healthFlag: reply.healthFlag,
    usedAI
  });
}
