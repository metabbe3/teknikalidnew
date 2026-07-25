import { NextRequest, NextResponse } from "next/server";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { thesisService } from "@/domains/thesis/thesis.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, body } = await withCronLogging("sync-eod", async () => {
      await dataSyncService.syncEndOfDayData();
      // Recompute indicators on the just-synced EOD prices so the breach scan
      // sees fresh signal verdicts (no verdict-flip lag). Isolated + bounded by the cron max-time.
      try {
        await technicalAnalysisService.calculateAllIndicators();
      } catch (e) {
        console.error("[recalc-indicators]", e);
      }
      // Thesis breach scan piggybacks on EOD sync (isolated — never breaks the cron).
      try {
        await thesisService.scanAndNotifyBreaches();
      } catch (e) {
        console.error("[thesis-breach-scan]", e);
      }
      return { status: 200, body: { success: true } };
    });
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
