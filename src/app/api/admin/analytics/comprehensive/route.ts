import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { analyticsService } from "@/domains/analytics/analytics.service";
import type { TrafficSource } from "@/domains/analytics/analytics.service";

export const dynamic = "force-dynamic";

const VALID_SOURCES: TrafficSource[] = [
  "organic-search",
  "social",
  "direct",
  "referral",
  "email",
];

/**
 * GET /api/admin/analytics/comprehensive
 *
 * Query params:
 * - start: ISO date string (default: 7 days ago)
 * - end: ISO date string (default: now)
 * - path: path pattern filter (e.g., "/stocks/" matches all stock pages)
 * - source: filter by traffic source
 *
 * @example
 * /api/admin/analytics/comprehensive?start=2024-01-01&end=2024-01-31&path=/stocks/&source=organic-search
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;

    // Parse date range
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = startParam ? new Date(startParam) : defaultStart;
      endDate = endParam ? new Date(endParam) : now;
    } catch {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 (e.g., 2024-01-01)" },
        { status: 400 },
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "start date must be before end date" },
        { status: 400 },
      );
    }

    // Max 90 day range to prevent heavy queries
    const rangeMs = endDate.getTime() - startDate.getTime();
    if (rangeMs > 90 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Date range cannot exceed 90 days" },
        { status: 400 },
      );
    }

    // Optional filters
    const pathPattern = searchParams.get("path") || undefined;
    const sourceParam = searchParams.get("source");
    const source =
      sourceParam && VALID_SOURCES.includes(sourceParam as TrafficSource)
        ? (sourceParam as TrafficSource)
        : undefined;

    const data = await analyticsService.getComprehensiveAnalytics({
      startDate,
      endDate,
      pathPattern,
      source,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch comprehensive analytics");
  }
}
