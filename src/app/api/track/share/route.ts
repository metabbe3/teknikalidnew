import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip-asn";
import { detectBot } from "@/lib/bot-detect";
import { parseBody, schemas } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/track/share — share-button click beacon.
 * Fire-and-forget; always 204, never surfaces errors to the client.
 * Mirrors /api/track/pageview minus the scrape-detection side effects
 * (those are pageview-specific). Share clicks are a user action, but we still
 * record isBot so admin numbers can exclude automated spam.
 */
export async function POST(request: NextRequest) {
  try {
    const [data, error] = await parseBody(request, schemas.share);
    if (error) return error;

    const session = await auth();
    const userId = session?.user?.id ?? null;
    const ip = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") ?? null;
    const { isBot } = await detectBot(userAgent, ip);

    await prisma.shareEvent.create({
      data: {
        target: data.target,
        context: data.context,
        path: data.path,
        userId,
        ip,
        userAgent,
        isBot,
      },
    });
  } catch {
    // Fire-and-forget: never expose errors to the client
  }

  return new NextResponse(null, { status: 204 });
}
