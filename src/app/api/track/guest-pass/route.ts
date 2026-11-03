import { NextRequest, NextResponse } from "next/server";
import { claimGuestTicker, serializeGuestPass } from "@/lib/guest-pass";
import { beaconKey, beaconRateLimited, claimUnderServerCap } from "@/lib/guest-pass-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/track/guest-pass — beacon from GuestStockTracker (anon only).
 * Registers the ticker against today's guest quota server-side (cookie)
 * so the RSC stock page can render full content while quota remains.
 * Fire-and-forget: always 204, never errors to client.
 *
 * sec-2026-10-29-02: rate-limit 429 di atas 30 beacon/mnt (IP+UA) dan
 * server-side daily cap (distinct ticker per key) — cookie reset/farming
 * tidak lagi memberi kuota ekstra. FE beacon abaikan response body.
 */
export async function POST(request: NextRequest) {
  try {
    const key = beaconKey(
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      request.headers.get("user-agent"),
    );
    if (beaconRateLimited(key)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = (await request.json()) as { ticker?: string };
    const ticker = (body.ticker ?? "").toUpperCase().slice(0, 12);
    if (!/^[A-Z0-9]{2,10}(\.JK)?$/.test(ticker)) return new NextResponse(null, { status: 204 });

    // Cap server-side: di atas SERVER_DAILY_CAP utk key ini = no-op (cookie
    // tidak ditambah) — 2 anonId beda cookie di IP sama tidak dapat kuota ganda.
    if (!claimUnderServerCap(key, ticker)) {
      return new NextResponse(null, { status: 204 });
    }

    const { state } = await claimGuestTicker(ticker);
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Set-Cookie", serializeGuestPass(state));
    return res;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
