import { NextResponse } from "next/server";
import { z } from "zod";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";
import { RANGE_DAYS, type DateRange } from "@/lib/constants";

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

    const result = await technicalAnalysisService.getIndicatorSeries(ticker, days);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch indicators");
  }
}
