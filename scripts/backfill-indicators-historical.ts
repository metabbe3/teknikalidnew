/**
 * backfill-indicators-historical.ts — compute per-date StockIndicator rows
 * for PAST dates from existing StockPrice history.
 *
 * DATA-ONLY. Writes rows; does NOT touch pages or sitemap. The spam-safe
 * emergence surface (the /stocks/[ticker]/indikator table page) is separate.
 * See the "Backfill Anti-Spam Strategy" section of the SEO plan.
 *
 * One computation pass per ticker: indicator primitives return arrays aligned
 * to the price array, so we extract values[i] for each date i and upsert a row.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/backfill-indicators-historical.ts BBRI   # one ticker
 *   npx tsx --tsconfig tsconfig.json scripts/backfill-indicators-historical.ts all     # IDX_STOCKS
 *
 * Idempotent: upserts on [stockId, date, interval].
 */
import { stockRepository } from "../src/domains/stock/stock.repository";
import { StockNotFoundError } from "../src/domains/stock/stock.errors";
import { computeSignalScore } from "../src/domains/stock/technical-analysis.service";
import { IDX_STOCKS, INTERVAL } from "../src/lib/constants";
import {
  calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands,
  calculateStochastic, calculateATR, calculateADX, calculateVWAP, calculateOBV,
  classifyObvTrend, calculateSupertrend,
} from "../src/lib/indicators";

const MIN_LOOKBACK = 200; // SMA200 needs 200 points; start writing rows here
const PRICE_TAKE = -700;  // ~2.5 years of daily prices, ascending

interface CrossState { signal: string | null; date: Date | null }

/** Per-index cross regime: signal = current regime label, date = onset. */
function trackCrosses(
  fast: (number | null)[], slow: (number | null)[], dates: Date[],
  goldenLabel: string, deathLabel: string,
): CrossState[] {
  const out: CrossState[] = [];
  let state: string | null = null;
  let onset: Date | null = null;
  for (let i = 0; i < fast.length; i++) {
    const f = fast[i]; const s = slow[i];
    if (f === null || s === null) { out.push({ signal: null, date: null }); continue; }
    const cur = f > s ? goldenLabel : deathLabel;
    if (cur !== state) { state = cur; onset = dates[i]; }
    out.push({ signal: state, date: onset });
  }
  return out;
}

async function backfillTicker(tickerJK: string): Promise<number> {
  const stock = await stockRepository.findStockByTicker(tickerJK);
  if (!stock) throw new StockNotFoundError(tickerJK);

  const prices = await stockRepository.findPrices(stock.id, { orderBy: "asc", take: PRICE_TAKE });
  if (prices.length < MIN_LOOKBACK) {
    console.warn(`  ${tickerJK}: only ${prices.length} prices, need ${MIN_LOOKBACK}+ — skipping`);
    return 0;
  }

  const dates = prices.map((p) => p.date);
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

  const smaCross = trackCrosses(sma50, sma200, dates, "golden_cross", "death_cross");
  const emaCross = trackCrosses(ema12, ema26, dates, "bullish", "bearish");

  let written = 0;
  for (let i = MIN_LOOKBACK; i < prices.length; i++) {
    const m = macd[i]; const b = bb[i]; const st = stoch[i];
    const rsi = rsi14[i];
    const price = closes[i];
    const { score, label } = computeSignalScore({
      price,
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i],
      ema12: ema12[i], ema26: ema26[i],
      rsi14: rsi,
      macdHist: m?.histogram ?? null,
      stochK: st?.k ?? null, stochD: st?.d ?? null,
      adx: adx[i], supertrend: supertrend[i],
      obvTrend, vwap: vwap[i],
    });

    await stockRepository.upsertStockIndicator(stock.id, dates[i], INTERVAL.DAY, {
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i],
      ema12: ema12[i], ema26: ema26[i],
      rsi14: rsi,
      macdLine: m?.macd ?? null, macdSignal: m?.signal ?? null, macdHist: m?.histogram ?? null,
      bbUpper: b?.upper ?? null, bbMiddle: b?.middle ?? null, bbLower: b?.lower ?? null,
      stochK: st?.k ?? null, stochD: st?.d ?? null,
      adx: adx[i], vwap: vwap[i], atr: atr[i],
      obv: obv[i], obvTrend,
      supertrend: supertrend[i],
      smaCrossSignal: smaCross[i].signal, smaCrossDate: smaCross[i].date,
      emaCrossSignal: emaCross[i].signal, emaCrossDate: emaCross[i].date,
      signalScore: score, signalLabel: label,
    });
    written++;
  }
  return written;
}

async function main() {
  const arg = process.argv[2]?.toUpperCase();
  const tickers = !arg || arg === "ALL"
    ? IDX_STOCKS.map((s) => s.ticker)
    : [arg.endsWith(".JK") ? arg : `${arg}.JK`];

  console.log(`Backfilling indicators for ${tickers.length} ticker(s)...`);
  let total = 0; let ok = 0; let fail = 0;
  for (const t of tickers) {
    try {
      const n = await backfillTicker(t);
      total += n; ok++;
      console.log(`  ✓ ${t}: ${n} rows`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${t}: ${(e as Error).message}`);
    }
  }
  console.log(`\nDone. ${ok} ok, ${fail} failed, ${total} rows written.`);
  process.exit(fail > 0 && ok === 0 ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
