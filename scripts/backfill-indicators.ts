/**
 * backfill-indicators — one-time backfill of historical StockIndicator rows.
 *
 * The daily path (indicator.service.calculateIndicators) computes full indicator
 * arrays but persists ONLY the latest date per stock. So StockIndicator history
 * is shallow (~190 dates from 2025-11-20) even though StockPrice goes back to
 * 2025-01-15. This script recomputes indicators across the FULL price series and
 * fills every missing per-date row — unlocks depth for the /akademi live-example
 * + /indikator archive + verdict-prose trend context.
 *
 * Mechanics:
 *  - fetch ALL prices (asc) per stock; compute the same indicator arrays the
 *    daily path uses (causal → element[i] is the correct value as-of date i).
 *  - per-date SMA/EMA crossover STATE via a forward pass (O(n)) — matches the
 *    daily "most-recent cross as-of now" semantics, applied per date.
 *  - prisma.stockIndicator.createMany({ skipDuplicates: true }) → only INSERTs
 *    missing (stockId,date,interval) rows; never overwrites the daily-owned
 *    latest row, so gorengan flags are preserved. gorengan intentionally not
 *    set here (it's a current-state flag needing latest volume/marketCap).
 *
 * Run: npx tsx scripts/backfill-indicators.ts [--limit N] [--dry-run]
 */
import pLimit from "p-limit";
import {
  calculateSMA, calculateEMA, calculateRSI, calculateMACD,
  calculateBollingerBands, calculateStochastic, calculateATR, calculateADX,
  calculateVWAP, calculateOBV, calculateSupertrend, resolveMacdLine, classifyObvTrend,
} from "../src/lib/indicators";
import { computeSignalScore } from "../src/domains/stock/indicator.service";
import { INTERVAL } from "../src/lib/constants";
import { Prisma } from "@/generated/prisma/client";
import { stockRepository } from "../src/domains/stock/stock.repository";
import { prisma } from "../src/lib/prisma";
import { runScript } from "./lib/run";

type PriceRow = { date: Date; close: import("@/generated/prisma/client").Prisma.Decimal; high: import("@/generated/prisma/client").Prisma.Decimal; low: import("@/generated/prisma/client").Prisma.Decimal; volume: bigint };

/**
 * Forward-pass crossover state. Returns per-index {signal,date} = the most-recent
 * cross (bullLabel/bearLabel) that occurred at or before that index. Matches
 * indicator.service.detectCrossover semantics but evaluated as-of each date.
 */
function trackCrossStates(
  fast: (number | null)[],
  slow: (number | null)[],
  prices: { date: Date }[],
  bullLabel: string,
  bearLabel: string,
): { signals: (string | null)[]; dates: (Date | null)[] } {
  const n = fast.length;
  const signals: (string | null)[] = new Array(n).fill(null);
  const dates: (Date | null)[] = new Array(n).fill(null);
  let curSignal: string | null = null;
  let curDate: Date | null = null;
  for (let i = 1; i < n; i++) {
    const f0 = fast[i - 1], s0 = slow[i - 1], f1 = fast[i], s1 = slow[i];
    if (f0 == null || s0 == null || f1 == null || s1 == null) {
      signals[i] = curSignal; dates[i] = curDate; continue;
    }
    if (f0 < s0 && f1 >= s1) { curSignal = bullLabel; curDate = prices[i].date; }
    else if (f0 > s0 && f1 <= s1) { curSignal = bearLabel; curDate = prices[i].date; }
    signals[i] = curSignal; dates[i] = curDate;
  }
  return { signals, dates };
}

async function backfillStock(stockId: number, dryRun: boolean): Promise<number> {
  // take: large positive to fetch full history (Prisma negative take = "last N", so -1 = 1 row).
  const prices = (await stockRepository.findPrices(stockId, { orderBy: "asc", take: 100000 })) as PriceRow[];
  if (prices.length < 20) return 0;

  const closes = prices.map((p) => p.close.toNumber());
  const highs = prices.map((p) => p.high.toNumber());
  const lows = prices.map((p) => p.low.toNumber());
  const volumes = prices.map((p) => Number(p.volume));

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);
  const stoch = calculateStochastic(closes, highs, lows, 14, 3);
  const atr = calculateATR(highs, lows, closes, 14);
  const adx = calculateADX(highs, lows, closes, 14);
  const vwap = calculateVWAP(closes, volumes, highs, lows);
  const obv = calculateOBV(closes, volumes);
  const supertrend = calculateSupertrend(closes, highs, lows);
  const obvTrend = classifyObvTrend(obv);

  const smaCross = trackCrossStates(sma50, sma200, prices, "golden_cross", "death_cross");
  const emaCross = trackCrossStates(ema12, ema26, prices, "bullish", "bearish");

  const rows: Prisma.StockIndicatorCreateManyInput[] = [];
  for (let i = 0; i < prices.length; i++) {
    const m = macd[i], b = bb[i], s = stoch[i];
    const signal = computeSignalScore({
      price: closes[i],
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i],
      ema12: ema12[i], ema26: ema26[i],
      rsi14: rsi14[i], macdHist: m?.histogram ?? null,
      stochK: s?.k ?? null, stochD: s?.d ?? null,
      adx: adx[i], supertrend: supertrend[i], obvTrend, vwap: vwap[i],
    });
    rows.push({
      stockId,
      date: prices[i].date,
      interval: INTERVAL.DAY,
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i],
      ema12: ema12[i], ema26: ema26[i],
      rsi14: rsi14[i],
      macdLine: resolveMacdLine(m), macdSignal: m?.signal ?? null, macdHist: m?.histogram ?? null,
      bbUpper: b?.upper ?? null, bbMiddle: b?.middle ?? null, bbLower: b?.lower ?? null,
      stochK: s?.k ?? null, stochD: s?.d ?? null,
      adx: adx[i], vwap: vwap[i], atr: atr[i],
      obv: obv[i], obvTrend,
      supertrend: supertrend[i],
      smaCrossSignal: smaCross.signals[i], smaCrossDate: smaCross.dates[i],
      emaCrossSignal: emaCross.signals[i], emaCrossDate: emaCross.dates[i],
      signalScore: signal.score,
      signalLabel: signal.label,
    });
  }

  if (dryRun) return rows.length;

  // skipDuplicates: only fills missing (stockId,date,interval) rows — never
  // clobbers the daily-owned latest row, so gorengan is preserved.
  if (rows.length > 0) {
    await prisma.stockIndicator.createMany({ data: rows, skipDuplicates: true });
  }
  return rows.length;
}

runScript("backfill-indicators", async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

  const stocks = await stockRepository.findActiveStocks();
  const target = limit ? stocks.slice(0, limit) : stocks;
  console.log(`Backfilling ${target.length}/${stocks.length} stocks${dryRun ? " (DRY RUN)" : ""}...`);

  const concurrency = pLimit(5);
  let done = 0;
  let totalRows = 0;
  const t0 = Date.now();
  const results = await Promise.allSettled(
    target.map((s) => concurrency(async () => {
      const n = await backfillStock(s.id, dryRun).catch((e) => {
        console.error(`  ✗ ${s.ticker}:`, e instanceof Error ? e.message : e);
        return 0;
      });
      totalRows += n;
      done++;
      if (done % 25 === 0 || done === target.length) {
        console.log(`  ${done}/${target.length} done — ${totalRows} rows (${Math.round((Date.now() - t0) / 1000)}s)`);
      }
    })),
  );
  const failures = results.filter((r) => r.status === "rejected").length;
  console.log(`Backfill ${dryRun ? "(dry-run) " : ""}complete: ${totalRows} rows across ${target.length} stocks${failures ? `, ${failures} failed` : ""}.`);
});
