import { NextRequest, NextResponse } from "next/server";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";
import { parseQuery, schemas } from "@/lib/validation";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.screener);
    if (error) return error;

    if (data.preset) {
      const result = await technicalAnalysisService.screenerQuery(data.preset, data.assetClass);
      if (result && "error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Custom query mode - map validated query params to filters
    const filters: Record<string, unknown> = {};
    if (data.rsi_min !== undefined) filters.rsiMin = data.rsi_min;
    if (data.rsi_max !== undefined) filters.rsiMax = data.rsi_max;
    if (data.stoch_k_min !== undefined) filters.stochKMin = data.stoch_k_min;
    if (data.stoch_k_max !== undefined) filters.stochKMax = data.stoch_k_max;
    if (data.adx_min !== undefined) filters.adxMin = data.adx_min;
    if (data.vol_multiplier !== undefined) filters.volumeMinMultiplier = data.vol_multiplier;
    if (data.above_sma200 === "true") filters.aboveSma200 = true;
    if (data.below_sma200 === "true") filters.belowSma200 = true;
    if (data.macd_bullish === "true") filters.macdBullish = true;
    if (data.bb_squeeze === "true") filters.bbSqueeze = true;
    if (data.signal_score_min !== undefined) filters.signalScoreMin = data.signal_score_min;
    if (data.signal_score_max !== undefined) filters.signalScoreMax = data.signal_score_max;
    if (data.sector) filters.sector = data.sector.split(",").map((s) => s.trim()).filter(Boolean);
    if (data.price_min !== undefined) filters.priceMin = data.price_min;
    if (data.price_max !== undefined) filters.priceMax = data.price_max;
    if (data.exclude_gorengan === "true") filters.excludeGorengan = true;
    if (data.sort_by) filters.sortBy = data.sort_by;
    if (data.sort_order) filters.sortOrder = data.sort_order;
    if (data.assetClass) filters.assetClass = data.assetClass;

    if (Object.keys(filters).length === 0) {
      return NextResponse.json({ error: "Provide preset or filter parameters" }, { status: 400 });
    }

    const result = await technicalAnalysisService.customScreenerQuery(filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "run screener");
  }
}
