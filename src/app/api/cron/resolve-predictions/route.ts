import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { prisma } from "@/lib/prisma";
import { PREDICTION_OUTCOME, PREDICTION_DIRECTION } from "@/lib/constants";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";
import { withTimeout } from "@/domains/cron-monitoring/with-timeout";

// sec-2026-10-22-01: hard ceiling agar handler tidak menggantung tanpa batas.
// 60s ≈ 3000x durasi historis max (20ms, CronLog 30d) — job idempotent & re-run otomatis.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    const { status, body } = await withCronLogging("resolve-predictions", () =>
      withTimeout(async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const expired = await prisma.post.updateMany({
        where: {
          predictionDirection: { not: null },
          predictionOutcome: null,
          createdAt: { lt: thirtyDaysAgo },
        },
        data: {
          predictionOutcome: PREDICTION_OUTCOME.EXPIRED,
          predictionResolvedAt: now,
        },
      });

      const pending = await prisma.post.findMany({
        where: {
          predictionDirection: { not: null },
          predictionOutcome: null,
          createdAt: { lt: sevenDaysAgo, gte: thirtyDaysAgo },
          tickerTag: { not: null },
        },
        select: {
          id: true,
          tickerTag: true,
          predictionDirection: true,
          predictionTarget: true,
        },
      });

      if (pending.length === 0) {
        return { status: 200, body: { expired: expired.count, resolved: 0 } as Record<string, unknown> };
      }

      const tickers = [...new Set(pending.map((p) => p.tickerTag!))];
      const stocks = await prisma.stock.findMany({
        where: { ticker: { in: tickers } },
        select: { id: true, ticker: true },
      });
      const stockByTicker = new Map(stocks.map((s) => [s.ticker, s.id]));

      // Batch fetch latest prices for all tickers in one query
      const stockIds = Array.from(stockByTicker.values());
      // PERF fix (22 Okt, temuan db_guard): fetch orderBy date desc TANPA limit
      // menarik SELURUH riwayat harga semua saham (15jt+ rows terakumulasi di
      // pg_stat_statements). distinct per stockId + order date desc = tepat 1 baris
      // (close terbaru) per saham — pola sama dgn findStockIdsWithCrossSignal.
      const prices = await prisma.stockPrice.findMany({
        where: { stockId: { in: stockIds } },
        orderBy: [{ stockId: "asc" }, { date: "desc" }],
        distinct: ["stockId"],
        select: { stockId: true, close: true },
      });

      const latestByStock = new Map<number, number>();
      for (const p of prices) {
        if (!latestByStock.has(p.stockId)) {
          latestByStock.set(p.stockId, Number(p.close));
        }
      }

      const tickerPrice = new Map<string, number>();
      for (const [ticker, stockId] of stockByTicker) {
        const price = latestByStock.get(stockId);
        if (price !== undefined) tickerPrice.set(ticker, price);
      }

      let correct = 0;
      let incorrect = 0;
      const results: Array<{ id: string; outcome: string }> = [];

      for (const post of pending) {
        const actualPrice = tickerPrice.get(post.tickerTag!);
        if (actualPrice === undefined) continue;

        const target = Number(post.predictionTarget);
        const direction = post.predictionDirection!;

        let outcome: string;
        if ((direction === PREDICTION_DIRECTION.UP && actualPrice >= target) ||
            (direction === PREDICTION_DIRECTION.DOWN && actualPrice <= target)) {
          outcome = PREDICTION_OUTCOME.CORRECT;
          correct++;
        } else {
          outcome = PREDICTION_OUTCOME.INCORRECT;
          incorrect++;
        }

        results.push({ id: post.id, outcome });
      }

      await Promise.all(
        results.map((r) =>
          prisma.post.update({
            where: { id: r.id },
            data: { predictionOutcome: r.outcome, predictionResolvedAt: now },
          }),
        ),
      );

      return {
        status: 200,
        body: {
          expired: expired.count,
          resolved: results.length,
          correct,
          incorrect,
        } as Record<string, unknown>,
      };
      }, 60_000, "resolve-predictions"),
    );
    return NextResponse.json(body, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
