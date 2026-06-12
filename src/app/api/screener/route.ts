import { NextResponse } from "next/server";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get("preset");

    if (preset) {
      const result = await technicalAnalysisService.screenerQuery(preset);
      if (result && "error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Custom query mode
    const filters: Record<string, unknown> = {};
    const rsiMin = searchParams.get("rsi_min");
    const rsiMax = searchParams.get("rsi_max");
    const stochKMin = searchParams.get("stoch_k_min");
    const stochKMax = searchParams.get("stoch_k_max");
    const adxMin = searchParams.get("adx_min");
    const volumeMultiplier = searchParams.get("vol_multiplier");
    const signalScoreMin = searchParams.get("signal_score_min");
    const signalScoreMax = searchParams.get("signal_score_max");
    const sector = searchParams.get("sector");
    const priceMin = searchParams.get("price_min");
    const priceMax = searchParams.get("price_max");
    const excludeGorengan = searchParams.get("exclude_gorengan");
    const sortBy = searchParams.get("sort_by");
    const sortOrder = searchParams.get("sort_order");

    if (rsiMin) filters.rsiMin = Number(rsiMin);
    if (rsiMax) filters.rsiMax = Number(rsiMax);
    if (stochKMin) filters.stochKMin = Number(stochKMin);
    if (stochKMax) filters.stochKMax = Number(stochKMax);
    if (adxMin) filters.adxMin = Number(adxMin);
    if (volumeMultiplier) filters.volumeMinMultiplier = Number(volumeMultiplier);
    if (searchParams.get("above_sma200") === "true") filters.aboveSma200 = true;
    if (searchParams.get("below_sma200") === "true") filters.belowSma200 = true;
    if (searchParams.get("macd_bullish") === "true") filters.macdBullish = true;
    if (searchParams.get("bb_squeeze") === "true") filters.bbSqueeze = true;
    if (signalScoreMin) filters.signalScoreMin = Number(signalScoreMin);
    if (signalScoreMax) filters.signalScoreMax = Number(signalScoreMax);
    if (sector) filters.sector = sector.split(",").map((s) => s.trim()).filter(Boolean);
    if (priceMin) filters.priceMin = Number(priceMin);
    if (priceMax) filters.priceMax = Number(priceMax);
    if (excludeGorengan === "true") filters.excludeGorengan = true;
    if (sortBy && ["signalScore", "rsi14", "volume", "changePercent", "close"].includes(sortBy)) {
      filters.sortBy = sortBy;
    }
    if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
      filters.sortOrder = sortOrder;
    }

    if (Object.keys(filters).length === 0) {
      return NextResponse.json({ error: "Provide preset or filter parameters" }, { status: 400 });
    }

    const result = await technicalAnalysisService.customScreenerQuery(filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "run screener");
  }
}
