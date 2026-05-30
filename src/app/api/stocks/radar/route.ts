import { NextResponse } from "next/server";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";

export const revalidate = 60;

export async function GET() {
  try {
    const data = await technicalAnalysisService.getBottomFishingRadar();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch bottom fishing radar");
  }
}
