import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip-asn";
import { detectBot } from "@/lib/bot-detect";
import { parseBody, schemas } from "@/lib/validation";

export const dynamic = "force-dynamic";

// In-memory per-IP rate limit (mirrors proxy.ts rateLimited(); beacon flush is
// ≤2 req/10s per client, so 65/min only trips runaway/abusive loops).
const RATE_LIMIT = 65;
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_ENTRIES = 5000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (rateLimitMap.size > MAX_RATE_ENTRIES) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

/**
 * POST /api/public/engagement — dwell/scroll/CTA telemetry beacon
 * (prd-2026-10-10-01). Fire-and-forget; 204 on everything except rate-limit
 * (429). No PII stored — anonId is a client-side uuid; IP/UA are used only
 * in-memory for rate limiting + bot filtering, never persisted (unlike
 * PageView/ShareEvent). Path comes from the payload because a batch flush may
 * carry events captured on a previous page; it is validated (≤255, no query
 * string — stripped client-side).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    if (rateLimited(ip ?? "unknown")) {
      return new NextResponse(null, { status: 429 });
    }

    const userAgent = request.headers.get("user-agent") ?? null;
    const { isBot } = await detectBot(userAgent, ip);
    if (isBot) return new NextResponse(null, { status: 204 });

    const [data, error] = await parseBody(request, schemas.engagement);
    if (error) return new NextResponse(null, { status: 204 });

    await prisma.engagementEvent.createMany({
      data: data.events.map((e) => ({
        anonId: data.anonId,
        path: e.path,
        type: e.type,
        label: e.label ?? null,
        valueNum: e.valueNum ?? null,
      })),
    });
  } catch {
    // Fire-and-forget: never expose errors to the client
  }

  return new NextResponse(null, { status: 204 });
}
