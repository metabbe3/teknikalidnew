import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { auditService } from "@/domains/audit/audit.service";
import { dataSyncService } from "@/domains/stock/data-sync.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { fetchQuote } from "@/lib/yahoo-finance";
import { qstash } from "@/lib/queue";
import { pushActivity } from "@/lib/activity-log";
import { cronMonitoringService } from "@/domains/cron-monitoring/cron-monitoring.service";
import { CRON_JOB_REGISTRY } from "@/domains/cron-monitoring/cron-registry";

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
        cronMonitoringService.logExecution({
          jobName: "sync-eod",
          status: "success",
          startedAt: new Date(startTime),
          durationMs: Date.now() - startTime,
          result: { batches, duration: `${duration}s` },
          triggeredBy: "manual",
        });
        return NextResponse.json({ success: true, batches, duration: `${duration}s` });
      }
      case "sync-intraday": {
        const startTime = Date.now();
        const result = await dataSyncService.syncIntradayHotList();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        await auditService.log(user.id, "admin:sync_intraday", { duration }, ip);
        cronMonitoringService.logExecution({
          jobName: "sync-intraday",
          status: "success",
          startedAt: new Date(startTime),
          durationMs: Date.now() - startTime,
          result: { ...result, duration: `${duration}s` },
          triggeredBy: "manual",
        });
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
      default: {
        // Generic proxy: forward to cron route with CRON_SECRET
        const job = CRON_JOB_REGISTRY.find((j) => j.jobName === action);
        if (!job) {
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }
        const baseUrl = process.env.SITE_URL || "http://localhost:3000";
        const proxyRes = await fetch(`${baseUrl}${job.route}`, {
          method: job.method,
          headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        });
        const result = await proxyRes.json();
        await auditService.log(user.id, `admin:trigger_${action}`, { ok: proxyRes.ok }, ip);
        return NextResponse.json(result, { status: proxyRes.status });
      }
    }
  } catch (error: unknown) {
    return handleApiError(error, "admin trigger");
  }
}
