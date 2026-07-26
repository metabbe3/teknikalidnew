import { NextResponse } from "next/server";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const assetClass = new URL(request.url).searchParams.get("assetClass");
    const scoped = assetClass === "EQUITY" || assetClass === "CRYPTO" ? assetClass : undefined;
    const data = await technicalAnalysisService.getBottomFishingRadar(scoped);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch bottom fishing radar");
  }
}
