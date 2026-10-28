import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Ingest foreign flow (IDX TradingSummary GetStockSummary) — usp-2026-10-24-04.
 * Dipanggil oleh ~/.hermes/scripts/idx_foreign_sync.py (Playwright CF-bypass).
 * Idempoten: upsert by (stockId, date); ticker tanpa row Stock di-skip.
 */
export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  let payload: { sessionDate?: string; rows?: { code: string; date: string; foreignBuy: number; foreignSell: number }[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rows = payload.rows ?? [];
  if (!payload.sessionDate || rows.length === 0) {
    return NextResponse.json({ error: "sessionDate/rows kosong" }, { status: 400 });
  }

  // Map ticker → stockId sekali (batch)
  const tickers = [...new Set(rows.map((r) => `${r.code}.JK`))];
  const stocks = await prisma.stock.findMany({
    where: { ticker: { in: tickers } },
    select: { id: true, ticker: true },
  });
  const idByTicker = new Map(stocks.map((s) => [s.ticker, s.id]));

  const sessionDate = new Date(`${payload.sessionDate}T00:00:00Z`);
  let upserted = 0;
  const skipped: string[] = [];
  const B = 500;
  for (let i = 0; i < rows.length; i += B) {
    const batch = rows.slice(i, i + B).flatMap((r) => {
      const stockId = idByTicker.get(`${r.code}.JK`);
      if (!stockId) {
        skipped.push(r.code);
        return [];
      }
      return [
        prisma.foreignFlow.upsert({
          where: { stockId_date: { stockId, date: sessionDate } },
          create: { stockId, date: sessionDate, foreignBuy: r.foreignBuy, foreignSell: r.foreignSell },
          update: { foreignBuy: r.foreignBuy, foreignSell: r.foreignSell },
        }),
      ];
    });
    await prisma.$transaction(batch);
    upserted += batch.length;
  }

  return NextResponse.json({
    success: true,
    session: payload.sessionDate,
    received: rows.length,
    matched: upserted,
    skipped: skipped.length,
  });
}
