import { NextResponse } from "next/server";
import { stockRepository } from "@/domains/stock/stock.repository";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { INTERVAL } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const stock = await stockRepository.findStockByTicker(ticker);
    if (!stock) throw new StockNotFoundError(ticker);

    const [prices, indicator, { structure }] = await Promise.all([
      stockRepository.findPrices(stock.id, { orderBy: "desc", take: 2 }),
      stockRepository.findLatestIndicator(stock.id, INTERVAL.DAY),
      technicalAnalysisService.getMarketStructure(ticker),
    ]);

    const latest = prices[0];
    if (!latest) return NextResponse.json({ data: null });

    const close = Number(latest.close);
    const high = Number(latest.high);
    const low = Number(latest.low);
    const prev = prices[1];
    const prevClose = prev ? Number(prev.close) : close;

    const plan = technicalAnalysisService.generateTradingPlan({
      currentPrice: close,
      high,
      low,
      close,
      prevClose,
      atr: indicator?.atr ? Number(indicator.atr) : null,
      rsi14: indicator?.rsi14 ? Number(indicator.rsi14) : null,
      sma20: indicator?.sma20 ? Number(indicator.sma20) : null,
      sma50: indicator?.sma50 ? Number(indicator.sma50) : null,
      sma200: indicator?.sma200 ? Number(indicator.sma200) : null,
      macdHist: indicator?.macdHist ? Number(indicator.macdHist) : null,
      marketStructure: structure,
      supertrend: indicator?.supertrend ? Number(indicator.supertrend) : null,
      obvTrend: indicator?.obvTrend ?? null,
      stochK: indicator?.stochK ? Number(indicator.stochK) : null,
      stochD: indicator?.stochD ? Number(indicator.stochD) : null,
      adx: indicator?.adx ? Number(indicator.adx) : null,
    });

    return NextResponse.json({ data: plan });
  } catch (error) {
    return handleApiError(error, "fetch trading plan");
  }
}
