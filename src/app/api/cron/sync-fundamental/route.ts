import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFundamentalSummary } from "@/lib/yahoo-finance";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * teknikal-2026-10-24-02: backfill kolom kosong StockFundamental
 * (beta/bookValue/sharesOutstanding/averageDailyVolume3Month + refresh
 * dividendYield) via Yahoo quoteSummary. Idempoten upsert (stockId,date).
 * Dipanggil ~/.hermes/scripts/teknikalid_fundamental_sync.py (batch kecil,
 * sleep antar-batch utk rate-limit). Hanya mengisi kolom NULL — tidak
 * menimpa nilai existing (backfill, bukan overwrite).
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { tickers?: string[]; date?: string; limit?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const date = payload.date ? new Date(`${payload.date}T00:00:00Z`) : new Date();
  const dateKey = date.toISOString().slice(0, 10);

  // Target: saham aktif dengan row StockFundamental hari-date; kolom beta masih NULL
  let tickers: string[] = payload.tickers ?? [];
  if (tickers.length === 0) {
    const rows = await prisma.stockFundamental.findMany({
      where: { date: { equals: date }, beta: null, stock: { isActive: true } },
      select: { stock: { select: { ticker: true } } },
      take: payload.limit ?? 100,
    });
    tickers = rows.map((r) => r.stock.ticker);
  }
  if (tickers.length === 0) {
    return NextResponse.json({ success: true, date: dateKey, filled: 0, skipped: 0, note: "tidak ada row beta NULL" });
  }

  const idByTicker = new Map(
    (
      await prisma.stock.findMany({
        where: { ticker: { in: tickers } },
        select: { id: true, ticker: true },
      })
    ).map((s) => [s.ticker, s.id])
  );

  let filled = 0;
  const skipped: string[] = [];
  for (const ticker of tickers) {
    const stockId = idByTicker.get(ticker);
    if (!stockId) {
      skipped.push(ticker);
      continue;
    }
    const f = await fetchFundamentalSummary(ticker);
    if (!f || (f.beta === undefined && f.bookValue === undefined && f.sharesOutstanding === undefined)) {
      skipped.push(ticker);
      continue;
    }
    await prisma.stockFundamental.updateMany({
      where: { stockId, date, beta: null },
      data: {
        ...(f.beta !== undefined ? { beta: f.beta } : {}),
        ...(f.bookValue !== undefined ? { bookValue: f.bookValue } : {}),
        ...(f.sharesOutstanding !== undefined ? { sharesOutstanding: BigInt(Math.round(f.sharesOutstanding)) } : {}),
        ...(f.averageDailyVolume10Day !== undefined
          ? { averageDailyVolume3Month: BigInt(Math.round(f.averageDailyVolume10Day)) }
          : {}),
        ...(f.dividendYield !== undefined && f.dividendYield > 0 ? { dividendYield: f.dividendYield } : {}),
      },
    });
    filled++;
  }

  return NextResponse.json({ success: true, date: dateKey, filled, skipped: skipped.length, skippedSample: skipped.slice(0, 10) });
}
