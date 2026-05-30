import { NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { handleApiError } from "@/lib/api-error";
import { RANGE_KEYS, type DateRange } from "@/lib/constants";

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickers = searchParams.getAll("s");
    const range = (searchParams.get("range") ?? "6mo") as DateRange;

    if (tickers.length < 2 || tickers.length > 4) {
      return NextResponse.json({ error: "Select 2-4 stocks to compare" }, { status: 400 });
    }

    const stocks = await stockRepository.findStocksByTickers(tickers);
    if (stocks.length !== tickers.length) {
      return NextResponse.json({ error: "Invalid ticker(s)" }, { status: 400 });
    }

    if (!RANGE_KEYS.includes(range)) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }

    const result = await stockMarketService.getCompareData(stocks.map((s) => s.ticker), range);
    return NextResponse.json({ stocks: result });
  } catch (error) {
    return handleApiError(error, "compare stocks");
  }
}
