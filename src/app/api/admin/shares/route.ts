import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { analyticsService } from "@/domains/analytics/analytics.service";
import { wibDayStart, wibNextDayStart } from "@/lib/datetime-wib";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/shares — share-click analytics (ShareEvent table, bots excluded).
 * Query: start, end (ISO). Defaults to the last 7 WIB calendar days. Range ≤ 90d.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const now = new Date();
    const defaultStart = wibDayStart(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));

    let startDate: Date;
    let endDate: Date;
    try {
      startDate = startParam ? new Date(startParam) : defaultStart;
      endDate = endParam ? new Date(endParam) : wibNextDayStart(now);
    } catch {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601." },
        { status: 400 },
      );
    }
    // new Date("garbage") returns NaN-date without throwing — the try/catch above
    // never fires. Reject explicitly before the range checks (NaN comparisons are
    // all false, so invalid dates would otherwise sail through to Prisma → 500).
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use ISO 8601." }, { status: 400 });
    }

    if (startDate >= endDate) {
      return NextResponse.json({ error: "start date must be before end date" }, { status: 400 });
    }

    const rangeMs = endDate.getTime() - startDate.getTime();
    if (rangeMs > 90 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Date range cannot exceed 90 days" }, { status: 400 });
    }

    const data = await analyticsService.getShareAnalytics({ startDate, endDate });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch share analytics");
  }
}
