import { NextRequest, NextResponse } from "next/server";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, body } = await withCronLogging("sync-eod", async () => {
      await dataSyncService.syncEndOfDayData();
      return { status: 200, body: { success: true } };
    });
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
