import { NextRequest, NextResponse } from "next/server";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { stockRepository } from "@/domains/stock/stock.repository";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stocks = await stockRepository.findActiveStocks();
    const tickers = stocks.map((s) => s.ticker);
    const batches = await dataSyncService.dispatchEndOfDaySync(tickers);
    return NextResponse.json({ success: true, tickers: tickers.length, batches });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
