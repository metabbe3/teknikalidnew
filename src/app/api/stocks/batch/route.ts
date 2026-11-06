// GET /api/stocks/batch?s=BBCA,BBRI,ARKO (max 10 tickers)
// Internal batch endpoint for agentd and SSR peer/mover widgets.
// Uses JOIN LATERAL path to fetch quotes & indicators with 0 seq scan.

import { NextRequest, NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rawS = request.nextUrl.searchParams.get("s");
    if (!rawS || !rawS.trim()) {
      return NextResponse.json({ error: "Parameter s wajib diisi" }, { status: 400 });
    }

    const symbols = Array.from(
      new Set(
        rawS
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    ).slice(0, 10);

    if (symbols.length === 0) {
      return NextResponse.json({ error: "Parameter s wajib diisi" }, { status: 400 });
    }

    const items = await stockMarketService.getStockBatchWithIndicators(symbols);

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return handleApiError(error, "fetch stock batch");
  }
}
