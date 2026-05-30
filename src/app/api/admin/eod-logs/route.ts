import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  const [priceCounts, indicatorCounts] = await Promise.all([
    prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`SELECT DATE("date") as date, COUNT(*)::bigint as count FROM "StockPrice" WHERE "date" >= ${from} AND "date" <= ${to} GROUP BY DATE("date") ORDER BY date DESC`,
    prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`SELECT DATE("date") as date, COUNT(*)::bigint as count FROM "StockIndicator" WHERE "date" >= ${from} AND "date" <= ${to} GROUP BY DATE("date") ORDER BY date DESC`,
  ]);

  const priceMap = new Map(
    priceCounts.map((r) => [r.date.toISOString().slice(0, 10), Number(r.count)]),
  );
  const indicatorMap = new Map(
    indicatorCounts.map((r) => [r.date.toISOString().slice(0, 10), Number(r.count)]),
  );

  const allDates = new Set([...priceMap.keys(), ...indicatorMap.keys()]);
  const syncLogs = [...allDates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      pricesWritten: priceMap.get(date) ?? 0,
      indicatorsWritten: indicatorMap.get(date) ?? 0,
    }));

  const activityEntries = getRecentActivity(50).filter((e) =>
    e.action.toLowerCase().includes("eod"),
  );

  return NextResponse.json({ syncLogs, activityEntries });
  } catch (error) {
    return handleApiError(error, "fetch eod logs");
  }
}
