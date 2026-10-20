import { NextRequest, NextResponse } from "next/server";
import { claimGuestTicker, serializeGuestPass } from "@/lib/guest-pass";

export const dynamic = "force-dynamic";

/**
 * POST /api/track/guest-pass — beacon from GuestStockTracker (anon only).
 * Registers the ticker against today's guest quota server-side (cookie)
 * so the RSC stock page can render full content while quota remains.
 * Fire-and-forget: always 204, never errors to client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ticker?: string };
    const ticker = (body.ticker ?? "").toUpperCase().slice(0, 12);
    if (!/^[A-Z0-9]{2,10}(\.JK)?$/.test(ticker)) return new NextResponse(null, { status: 204 });

    const { state } = await claimGuestTicker(ticker);
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Set-Cookie", serializeGuestPass(state));
    return res;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
