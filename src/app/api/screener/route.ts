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

    if (Object.keys(filters).length === 0) {
      return NextResponse.json({ error: "Provide preset or filter parameters" }, { status: 400 });
    }

    const result = await technicalAnalysisService.customScreenerQuery(filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "run screener");
  }
}
