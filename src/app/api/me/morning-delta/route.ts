import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { morningDeltaService } from "@/domains/stock/morning-delta.service";

// ret-qw2 (retention-riset 2026-10-30): mode publik ?tickers=BBCA.JK,BMRI.JK utk pengunjung
// tanpa login (guest watchlist + lastVisited dari localStorage) — logika delta TETAP SATU PINTU
// di morningDeltaService (API Reuse Rule; tidak ada jalur hitung baru).
// Ticker divalidasi format BEI (A-Z 4-5 char + .JK), maks 15, di-cap agar tidak jadi scraping tool.
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.id) {
      const data = await morningDeltaService.getMorningDelta(session.user.id);
      return NextResponse.json({ data });
    }

    const raw = req.nextUrl.searchParams.get("tickers") ?? "";
    const tickers = Array.from(
      new Set(
        raw
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter((t) => /^[A-Z]{4,5}\.JK$/.test(t))
      ),
    ).slice(0, 15);
    if (tickers.length === 0) {
      return NextResponse.json({ data: { asOf: null, trackedCount: 0, bullets: [] } });
    }
    const data = await morningDeltaService.getDeltaForTickers(tickers);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch morning delta");
  }
}
