import { NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { handleApiError } from "@/lib/api-error";

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const detail = await stockMarketService.getStockDetail(ticker);

    return NextResponse.json({
      ticker: detail.stock.ticker,
      name: detail.stock.name,
      sector: detail.stock.sector,
      close: detail.close,
      change: detail.change,
      changePercent: detail.changePercent,
      volume: detail.latest.volume,
      open: detail.latest.open,
      high: detail.latest.high,
      low: detail.latest.low,
      prevClose: detail.prevClose,
      date: detail.latest.date,
      week52High: detail.week52High,
      week52Low: detail.week52Low,
      indicators: detail.indicator,
    });
  } catch (error) {
    return handleApiError(error, "fetch stock detail");
  }
}
