import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { technicalAnalysisService } from "@/domains/stock/technical-analysis.service";
import { thesisService } from "@/domains/thesis/thesis.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";
import { withTimeout } from "@/domains/cron-monitoring/with-timeout";
import { clearEodCaches } from "@/domains/stock/eod-cache";

// sec-2026-10-22-01: ceiling runtime (historis 30d: max 25,8s avg 22,3s → 120s ≈ 5x max).
// sync-eod idempotent (upsert) dan dijadwalkan tiap hari — hasil race yang telat diabaikan.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    const { status, body } = await withCronLogging("sync-eod", () =>
      withTimeout(async () => {
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
      // Pasca-sync: segarkan cache EOD screener/radar instan (ref-2026-10-17-03).
      try { clearEodCaches(); } catch (e) { console.error("[eod-cache-clear]", e); }
      return { status: 200, body: { success: true } };
      }, 120_000, "sync-eod"),
    );
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
