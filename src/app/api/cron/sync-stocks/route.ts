import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { stockSyncService, type IDXStockEntry } from "@/domains/stock/stock-sync.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

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
