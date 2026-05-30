import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const tickerFreshness = await prisma.$queryRaw<
    Array<{ ticker: string; lastUpdate: Date }>
  >`SELECT s.ticker, MAX(sp."date") as "lastUpdate" FROM "StockPrice" sp JOIN "Stock" s ON s.id = sp."stockId" WHERE s."isActive" = true GROUP BY s.ticker ORDER BY s.ticker`;

  const activityEntries = getRecentActivity(50).filter((e) =>
    e.action.toLowerCase().includes("intraday"),
  );

  return NextResponse.json({
    activityEntries,
    tickerFreshness: tickerFreshness.map((r) => ({
      ticker: r.ticker,
      lastUpdate: r.lastUpdate.toISOString(),
    })),
  });
  } catch (error) {
    return handleApiError(error, "fetch intraday logs");
  }
}
