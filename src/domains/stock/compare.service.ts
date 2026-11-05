/**
 * compare.service — Head-to-Head Compare /saham/[a]-vs-[b] (prd-2026-11-05-01).
 *
 * 28/170 pertanyaan Tanya AI 30d (16,5%) = "vs/lebih/banding" — permintaan ini
 * selama ini hanya dilayani chat 1-1. PRD: halaman SSR perbandingan berdampingan
 * (harga+performa, valuasi, sinyal) supaya pembaca menimbang 2 saham tanpa buka
 * 2 tab / tanya ulang.
 *
 * Pilar North Star: GROWTH (views) + AI-SEARCH (kontinuitas funnel chat).
 *
 * Arsitektur routing: Next.js TIDAK mendukung segmen parsial [a]-vs-[b] —
 * slug "BBCA.JK-vs-BBRI.JK" ditangani page.tsx di /saham/[ticker]/ yang
 * mem-parse "-vs-" (bare /saham/bbca tetap di-308 proxy ke /stocks/BBCA.JK
 * SEBELUM sampai page — matcher proxy lebih dulu).
 *
 * Data: 3 query per ticker via fetchStockBase (react cache — request-scoped,
 * sama dgn ticker page; tanpa N+1 loop). Skor sinyal & predicate label
 * konsisten screener-analysis.service (isOversoldSignal + smaCrossSignal).
 * Rumus % via marketEngine.pctChange (doctrine SATU PINTU bo-2026-11-02-01).
 */

import { cache } from "react";
import { marketEngine } from "@/lib/market-engine";
import { INTERVAL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { stockRepository } from "./stock.repository";
import { isOversoldSignal } from "./radar-filter";

export const COMPARE_VS_SEPARATOR = "-vs-";

/** Parse slug "/saham/[ticker]" → pasangan ticker (null = bukan halaman vs). */
export function parseCompareSlug(slug: string): [string, string] | null {
  const idx = slug.indexOf(COMPARE_VS_SEPARATOR);
  if (idx < 0) return null;
  // Normalisasi uppercase SEBELUM validasi — slug URL nyata lowercase
  // (failing-test-first: "bbca-vs-bbri" null karena regex cuma terima [A-Z]).
  const a = slug.slice(0, idx).trim().toUpperCase();
  const b = slug.slice(idx + COMPARE_VS_SEPARATOR.length).trim().toUpperCase();
  // Gate format: ticker IDX = 1-5 huruf (suffix .JK opsional), persis 2 pihak.
  // 3+ ticker ("A-vs-B-vs-C" → bagian B berisi "-vs-") = invalid → 404 (PRD AC1).
  const TICKER_RE = /^[A-Z0-9]{1,5}(\.JK)?$/;
  if (!a || !b) return null;
  if (!TICKER_RE.test(a) || !TICKER_RE.test(b)) return null;
  if (a === b) return null;
  return [a, b];
}

/** Kembalikan bentuk .JK (pasangan selalu IDX equity). */
export function toJk(t: string): string {
  return t.toUpperCase().replace(/\.JK$/, "") + ".JK";
}

export interface ComparePerfRow {
  close: number | null;
  /** % vs sesi sebelumnya (marketEngine.pctChange). */
  changePercent: number | null;
  chg1w: number | null;
  chg1m: number | null;
  /** Jumlah sesi trading tersedia (honesty utk data tipis). */
  sessions: number;
  asOf: Date | null;
}

export interface CompareValuationRow {
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  asOf: Date | null;
}

export interface CompareSignalRow {
  score: number | null;
  /** Label bahasa Indonesia via signalLabelId. */
  label: string | null;
  rsi14: number | null;
  smaCrossSignal: string | null;
  /** Predikat kondisi konsisten screener: golden_cross | oversold | neutral. */
  condition: "golden_cross" | "oversold" | "neutral";
  asOf: Date | null;
}

export interface CompareSide {
  ticker: string;
  name: string;
  sector: string;
  perf: ComparePerfRow;
  valuation: CompareValuationRow;
  signal: CompareSignalRow;
}

export interface CompareData {
  a: CompareSide;
  b: CompareSide;
}

/** % perubahan close vs close N sesi sebelumnya (dedupe stale). null = tak cukup data. */
function perfChange(
  closes: { close: number; date: Date }[],
  back: number,
): number | null {
  if (closes.length <= back) return null;
  const now = closes[0].close;
  const then = closes[back].close;
  return marketEngine.pctChange(now, then);
}

/** Fetch satu sisi perbandingan. Private — panggil via getCompareData. */
async function loadCompareSide(tickerJk: string): Promise<CompareSide | null> {
  const stock = await stockRepository.findStockByTicker(tickerJk);
  if (!stock || !stock.ticker.endsWith(".JK")) return null; // equity IDX saja (crypto page sudah diprun)

  const [rawPrices, indicators, fundamentals] = await Promise.all([
    stockRepository.findLatestTradingPrices(stock.id, 25),
    prisma.stockIndicator.findMany({
      where: { stockId: stock.id, interval: INTERVAL.DAY },
      orderBy: { date: "desc" },
      take: 1,
    }),
    prisma.stockFundamental.findFirst({
      where: { stockId: stock.id },
      orderBy: { date: "desc" },
    }),
  ]);

  // dedupe stale prices (baris carry-forward vol=0 saat beku/ARA) — sama dgn
  // stock-market.service, tapi tanpa import internal; guard close>0.
  const closes: { close: number; date: Date }[] = [];
  for (const p of rawPrices) {
    const c = Number(p.close);
    if (c <= 0 || !Number.isFinite(c)) continue;
    if (closes.length && closes[closes.length - 1].close === c) continue;
    closes.push({ close: c, date: p.date });
  }

  const ind = indicators[0];
  const fund = fundamentals;

  const rsi14 = ind?.rsi14 != null ? Number(ind.rsi14) : null;
  const stochK = ind?.stochK != null ? Number(ind.stochK) : null;
  const stochD = ind?.stochD != null ? Number(ind.stochD) : null;

  // Predikat SATU PINTU screener-analysis.service (L197-249):
  // golden_cross = smaCrossSignal === "golden_cross";
  // oversold     = isOversoldSignal(rsi14, stochK, stochD) (guard >0 bug-2026-10-25-01).
  let condition: CompareSignalRow["condition"] = "neutral";
  if (ind?.smaCrossSignal === "golden_cross") condition = "golden_cross";
  else if (isOversoldSignal(rsi14, stochK, stochD)) condition = "oversold";

  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    perf: {
      close: closes[0]?.close ?? null,
      changePercent:
        closes.length >= 2 ? marketEngine.pctChange(closes[0].close, closes[1].close) : null,
      chg1w: perfChange(closes, 5),
      chg1m: perfChange(closes, 21),
      sessions: closes.length,
      asOf: closes[0]?.date ?? null,
    },
    valuation: {
      pe: fund?.pe != null ? Number(fund.pe) : null,
      pb: fund?.pb != null ? Number(fund.pb) : null,
      dividendYield: fund?.dividendYield != null ? Number(fund.dividendYield) : null,
      marketCap: fund?.marketCap != null ? Number(fund.marketCap) : null,
      asOf: fund?.date ?? null,
    },
    signal: {
      score: ind?.signalScore != null ? Number(ind.signalScore) : null,
      label: ind?.signalLabel ?? null,
      rsi14,
      smaCrossSignal: ind?.smaCrossSignal ?? null,
      condition,
      asOf: ind?.date ?? null as unknown as Date | null,
    },
  };
}

export const compareService = {
  /** Pasangan perbandingan → data lengkap; null = salah satu ticker tak ada (→404). */
  getCompareData: cache(async function getCompareData(
    aJk: string,
    bJk: string,
  ): Promise<CompareData | null> {
    const [a, b] = await Promise.all([
      loadCompareSide(aJk),
      loadCompareSide(bJk),
    ]);
    if (!a || !b) return null;
    return { a, b };
  }),

  /** 3 ticker top-volume sektor sama utk blok "Bandingkan dengan" di ticker page. */
  async getComparePeers(tickerJk: string, limit = 3): Promise<string[]> {
    const stock = await stockRepository.findStockByTicker(tickerJk);
    if (!stock) return [];
    // IDX_STOCKS import static (bundle size utk ticker page) — pakai prisma langsung:
    const peers = await prisma.stock.findMany({
      where: { sector: stock.sector, isActive: true, assetClass: "EQUITY" },
      select: { ticker: true, prices: { orderBy: { date: "desc" }, take: 2, select: { close: true, volume: true } } },
      take: 40,
    });
    // nilai transaksi ~ close × volume sesi terakhir; top-N, exclude self.
    const ranked = peers
      .filter((p) => p.ticker !== tickerJk && p.prices[0])
      .map((p) => {
        const c = Number(p.prices[0].close);
        const v = Number(p.prices[0].volume);
        return { ticker: p.ticker, value: c * v };
      })
      .filter((r) => Number.isFinite(r.value) && r.value > 0)
      .sort((x, y) => y.value - x.value);
    return ranked.slice(0, limit).map((r) => r.ticker);
  },
};
