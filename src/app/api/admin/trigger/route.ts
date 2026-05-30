import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { auditService } from "@/domains/audit/audit.service";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { fetchQuote } from "@/lib/yahoo-finance";
import { qstash } from "@/lib/queue";
import { pushActivity } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const { action } = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    switch (action) {
      case "sync-eod": {
        const stocks = await stockRepository.findActiveStocks();
        const tickers = stocks.map((s) => s.ticker);
        const startTime = Date.now();
        const batches = await dataSyncService.dispatchEndOfDaySync(tickers);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        await auditService.log(user.id, "admin:sync_eod", { batches, duration }, ip);
        return NextResponse.json({ success: true, batches, duration: `${duration}s` });
      }
      case "sync-intraday": {
        const startTime = Date.now();
        const result = await dataSyncService.syncIntradayHotList();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        await auditService.log(user.id, "admin:sync_intraday", { duration }, ip);
        return NextResponse.json({ success: true, ...result, duration: `${duration}s` });
      }
      case "clear-queue":
      case "purge-queue": {
        try {
          let totalCancelled = 0;
          let cancelled: number;
          do {
            const result = await qstash.messages.cancel({ all: true });
            cancelled = result.cancelled;
            totalCancelled += cancelled;
          } while (cancelled > 0);
          await auditService.log(user.id, "admin:purge_queue", { totalCancelled }, ip);
          pushActivity({
            action: `Queue purged — ${totalCancelled} messages cancelled`,
            timestamp: new Date().toISOString(),
            duration: 0,
            status: "success",
          });
          return NextResponse.json({ success: true, purged: totalCancelled });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return NextResponse.json({ success: false, error: msg }, { status: 500 });
        }
      }
      case "test-yahoo": {
        const startTime = Date.now();
        const quote = await fetchQuote("BBCA.JK");
        const duration = Date.now() - startTime;
        await auditService.log(user.id, "admin:test_yahoo", { latency: `${duration}ms` }, ip);
        return NextResponse.json({
          success: true,
          latency: `${duration}ms`,
          price: quote.regularMarketPrice,
        });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: unknown) {
    return handleApiError(error, "admin trigger");
  }
}
