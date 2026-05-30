import { NextResponse } from "next/server";
import { z } from "zod";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { handleApiError } from "@/lib/api-error";
import { RANGE_DAYS, INTRADAY_CONFIG, type DateRange, type IntradayInterval } from "@/lib/constants";

export const revalidate = 300;

const rangeSchema = z.enum(["1D", "5D", "1mo", "3mo", "6mo", "1y", "2y"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = rangeSchema.safeParse(searchParams.get("range") ?? "6mo");
    if (!parsed.success) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    const range = parsed.data;
    const days = RANGE_DAYS[range] ?? 180;

    const intradayInterval = INTRADAY_CONFIG[range];

    let result;
    if (intradayInterval) {
      result = await stockMarketService.getStockIntradayHistory(ticker, intradayInterval, days);
    } else {
      result = await stockMarketService.getStockHistory(ticker, days);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch stock history");
  }
}
