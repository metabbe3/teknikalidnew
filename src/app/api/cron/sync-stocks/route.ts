import { NextRequest, NextResponse } from "next/server";
import { stockSyncService, type IDXStockEntry } from "@/domains/stock/stock-sync.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const stocks: IDXStockEntry[] = body.stocks;

    if (!Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json({ error: "stocks array is required" }, { status: 400 });
    }

    for (const s of stocks) {
      if (!s.code || !s.name || !s.board) {
        return NextResponse.json(
          { error: `Invalid stock entry: ${JSON.stringify(s)}. Required: code, name, board` },
          { status: 400 },
        );
      }
    }

    const { status: logStatus, body: logBody } = await withCronLogging("sync-stocks", async () => {
      const result = await stockSyncService.syncFromIDXStockList(stocks);
      return { status: 200, body: { data: result } as Record<string, unknown> };
    });
    return NextResponse.json(logBody, { status: logStatus });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
