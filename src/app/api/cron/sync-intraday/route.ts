import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    const { status, body } = await withCronLogging("sync-intraday", async () => {
      const result = await dataSyncService.syncIntradayHotList();
      return { status: 200, body: { success: true, ...result } as Record<string, unknown> };
    });
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
