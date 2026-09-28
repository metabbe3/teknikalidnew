import { NextResponse } from "next/server";
import { z } from "zod";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { RANGE_DAYS } from "@/lib/constants";

// Hybrid freemium: anon gets indicator overlays for the free chart, clamped to ~90 days.
export const dynamic = "force-dynamic";

const rangeSchema = z.enum(["1D", "5D", "1mo", "3mo", "6mo", "1y", "2y"]);

const ANON_MAX_DAYS = 90;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const session = await auth();
    const isAuthed = !!session?.user;
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = rangeSchema.safeParse(searchParams.get("range") ?? "6mo");
    if (!parsed.success) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    const range = parsed.data;
    const rangeDays = RANGE_DAYS[range] ?? 180;
    const days = isAuthed ? rangeDays : Math.min(rangeDays, ANON_MAX_DAYS);

    const result = await technicalAnalysisService.getIndicatorSeries(ticker, days);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch indicators");
  }
}
