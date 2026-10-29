import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/track/error — client-side error beacon (tracking-audit G10, Rp0).
 * Same-origin → lolos CSP connect-src 'self'. Fire-and-forget 204.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      message?: string; path?: string; anonId?: string;
    } | null;
    if (!body?.message) return new NextResponse(null, { status: 204 });
    const msg = String(body.message).slice(0, 500);
    const path = String(body.path ?? "/").slice(0, 255);
    const fp = `client:${msg.slice(0, 50)}`;
    const anonId = typeof body.anonId === "string" && /^[a-f0-9-]{8,36}$/i.test(body.anonId) ? body.anonId : null;
    await prisma.appErrorLog.upsert({
      where: { fingerprint: fp },
      create: { fingerprint: fp, kind: "client", path, message: msg, anonId },
      update: { count: { increment: 1 }, updatedAt: new Date() },
    });
  } catch { /* silent */ }
  return new NextResponse(null, { status: 204 });
}
