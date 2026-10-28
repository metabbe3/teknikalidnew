import { prisma } from "@/lib/prisma";
import { INTERVAL } from "@/lib/constants";
import { fetchQuote } from "@/lib/yahoo-finance";
import { bigIntToNumber, decimalToNumber } from "@/lib/serialize";
import { marketSnapshotService, type Mover } from "./market-snapshot.service";

/**
 * pasar-live.service — deterministic data assembly for /pasar (Koran Saham Live)
 * and the 4x/day Telegram push. PRD prd-pasar-live-01.
 *
 * HARD RULE (owner mandate "harus seakurat mungkin"): every number returned here
 * comes from the DB (StockPrice/StockIndicator) or the live quote endpoint —
 * never invented. Downstream (page + push script) renders these verbatim; the
 * LLM only ever writes narrative AROUND them.
 *
 * Cheap by design: 2 focused queries + 1 quote fetch per revalidation (60s
 * during market hours) — NOT the full-universe findActiveStocksWithPrices sweep.
 */

export interface PasarIhsg {
  close: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  date: string | null; // ISO date of the data session
  source: "live" | "db";
}

export interface PasarWatchlistItem {
  ticker: string; // with .JK
  name: string;
  close: number | null;
  changePercent: number | null;
  volumeShares: number | null;
  rsi14: number | null;
  reason: string; // human label for WHY it's on the list
  signalLabel: string | null;
}

export interface PasarForeignItem {
  ticker: string; // with .JK
  name: string;
  netValue: number; // Rp; positif = net beli asing
}

export interface PasarTopSignal {
  ticker: string; // with .JK
  name: string;
  close: number | null;
  changePercent: number | null;
  volumeShares: number | null;
  signalScore: number | null; // -1..1 normalized composite
  signalLabel: string | null;
}

export interface PasarMover {
  ticker: string; // with .JK
  name: string;
  close: number | null;
  changePercent: number | null;
  volumeShares: number | null;
}

export interface PasarNewsItem {
  ticker: string; // stripped, no .JK
  name: string;
  title: string;
  link: string;
  source: string;
  pubDate: string | null;
}

export interface PasarSnapshot {
  ihsg: PasarIhsg;
  watchlist: PasarWatchlistItem[];
  topSignals: PasarTopSignal[];
  foreign: { netBuy: PasarForeignItem[]; netSell: PasarForeignItem[] };
  gainers: PasarMover[];
  losers: PasarMover[];
  news: PasarNewsItem[];
  sessionDate: string | null; // latest StockPrice date (ISO yyyy-mm-dd)
  generatedAt: string; // ISO timestamp
}

/** WIB helpers — all "is the market open" logic runs on Asia/Jakarta wall clock. */
export function wibNow(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

export function wibHHMM(d = wibNow()): number {
  return d.getUTCHours() * 100 + d.getUTCMinutes();
}

export function wibDateKey(d = wibNow()): string {
  return d.toISOString().slice(0, 10);
}

/** Weekday check in WIB (getUTCDay on the +7h shifted clock). */
export function isWibWeekday(d = wibNow()): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

/** Market session windows in WIB HHMM: pre-open 08:45, regular 09:00-15:50 incl. closing negotiation. */
export function isMarketHours(d = wibNow()): boolean {
  return isWibWeekday(d) && wibHHMM(d) >= 845 && wibHHMM(d) < 1550;
}

/** Page "live" window per PRD: 06:30 (first push) until ~18:30 (recap published). */
export function isLiveWindow(d = wibNow()): boolean {
  return isWibWeekday(d) && wibHHMM(d) >= 630 && wibHHMM(d) < 1830;
}

async function getIhsg(): Promise<PasarIhsg> {
  // 1) live quote endpoint (field regularMarketPrice == 'price' on the wire)
  try {
    const q = await fetchQuote("^JKSE");
    if (q.regularMarketPrice != null) {
      return {
        close: q.regularMarketPrice,
        prevClose: q.regularMarketPreviousClose ?? null,
        change: q.regularMarketChange ?? null,
        changePercent: q.regularMarketChangePercent ?? null,
        date: null,
        source: "live",
      };
    }
  } catch (err) {
    console.warn("[pasar-live] live IHSG quote failed, falling back to DB:", err instanceof Error ? err.message : err);
  }
  // 2) DB fallback — latest two ^JKSE closes
  const ihsgStock = await prisma.stock.findFirst({
    where: { ticker: "^JKSE" },
    select: { id: true },
  });
  if (!ihsgStock) return { close: null, prevClose: null, change: null, changePercent: null, date: null, source: "db" };
  const prices = await prisma.stockPrice.findMany({
    where: { stockId: ihsgStock.id },
    orderBy: { date: "desc" },
    take: 2,
    select: { close: true, date: true },
  });
  const latest = prices[0];
  const prev = prices[1];
  const empty = { close: null, prevClose: null, change: null, changePercent: null, date: null, source: "db" as const };
  if (!latest) return empty;
  const close = decimalToNumber(latest.close);
  if (close === null) return empty;
  const prevClose = prev ? decimalToNumber(prev.close) : null;
  const change = prevClose !== null ? close - prevClose : null;
  const changePercent = prevClose !== null && prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : null;
  return { close, prevClose, change, changePercent, date: latest.date.toISOString().slice(0, 10), source: "db" };
}

/**
 * Watchlist = deterministic daily picks from the LATEST indicator date:
 *   - fresh golden cross (smaCrossSignal within the last 5 sessions)
 *   - fresh EMA12/26 bullish cross (same window)
 *   - oversold RSI < 32
 * Non-gorengan only (screener-analysis pattern: isGorengan: { not: true }).
 * One row per stock (a stock qualifies via its strongest reason), ranked so the
 * same data always yields the same list. Liquidity floor: median-ish volume via
 * latest close * volume ≥ Rp1B traded value (excludes illiquid micro caps that
 * make the list look like a gorengan board).
 */
const WATCH_MAX = 8;

async function getWatchlist(sessionDate: Date): Promise<PasarWatchlistItem[]> {
  const freshSince = new Date(sessionDate);
  freshSince.setUTCDate(freshSince.getUTCDate() - 4); // 5 sessions incl. latest

  const rows = await prisma.stockIndicator.findMany({
    where: {
      interval: INTERVAL.DAY,
      date: sessionDate,
      isGorengan: { not: true },
      stock: { isActive: true, assetClass: "EQUITY" },
      OR: [
        { smaCrossSignal: "golden_cross", smaCrossDate: { gte: freshSince } },
        { emaCrossSignal: "bullish", emaCrossDate: { gte: freshSince } },
        { rsi14: { lt: 32 } },
      ],
    },
    include: {
      stock: { select: { ticker: true, name: true } },
    },
    orderBy: [{ signalScore: "desc" }],
    take: 120,
  });

  // Latest close+volume per candidate (StockPrice @@index [stockId, date desc])
  const items: PasarWatchlistItem[] = [];
  for (const r of rows) {
    const prices = await prisma.stockPrice.findMany({
      where: { stockId: r.stockId },
      orderBy: { date: "desc" },
      take: 2,
      select: { close: true, volume: true, date: true },
    });
    const latest = prices[0];
    const prev = prices[1];
    if (!latest || !prev) continue;
    const close = decimalToNumber(latest.close);
    const prevClose = decimalToNumber(prev.close);
    const volume = bigIntToNumber(latest.volume);
    if (close === null || prevClose === null || prevClose === 0 || volume === null) continue;
    // liquidity floor: nilai transaksi hari terakhir ≥ Rp1 miliar
    if (close * volume < 1_000_000_000) continue;

    const changePercent = ((close - prevClose) / prevClose) * 100;
    const rsi = decimalToNumber(r.rsi14);
    let reason = "";
    if (r.smaCrossSignal === "golden_cross" && r.smaCrossDate && r.smaCrossDate >= freshSince) {
      reason = "Golden cross baru";
    } else if (r.emaCrossSignal === "bullish" && r.emaCrossDate && r.emaCrossDate >= freshSince) {
      reason = "EMA bullish cross";
    } else if (rsi !== null && rsi < 32) {
      reason = `Oversold RSI ${rsi.toFixed(0)}`;
    } else {
      continue;
    }

    items.push({
      ticker: r.stock.ticker,
      name: r.stock.name,
      close,
      changePercent,
      volumeShares: volume,
      rsi14: rsi,
      reason,
      signalLabel: r.signalLabel ?? null,
    });
    if (items.length >= WATCH_MAX) break;
  }
  return items;
}

/**
 * Top movers — ref-2026-10-17-01: SATU PINTU. Delegates to
 * marketSnapshotService (same raw JOIN-LATERAL prev-close + vol ≥ 1M floor
 * this function used to run itself) so /pasar can never drift from home /
 * /stocks / /berita again. Signature/shape unchanged for the /pasar page.
 */
async function getMovers(sessionDate: Date): Promise<{ gainers: PasarMover[]; losers: PasarMover[] }> {
  const snap = await marketSnapshotService.getSnapshot();
  // Only serve movers when the snapshot describes the SAME session the caller
  // resolved — a stale/empty snapshot must not fabricate data for another day.
  if (!snap.sessionDate || snap.sessionDate !== sessionDate.toISOString().slice(0, 10)) {
    return { gainers: [], losers: [] };
  }
  const toPasarMover = (m: Mover): PasarMover => ({
    ticker: m.ticker,
    name: m.name,
    close: m.close,
    changePercent: m.changePercent,
    volumeShares: m.volumeShares,
  });
  return {
    gainers: snap.gainers.map(toPasarMover),
    losers: snap.losers.map(toPasarMover),
  };
}

/**
 * Top net foreign flow sesi terakhir (usp-2026-10-24-04, owner-directed 24 Okt).
 * Source: tabel ForeignFlow (sync idx_foreign_sync.py dari IDX TradingSummary).
 * ForeignBuy/Sell IDX dalam LEMBAR — nilai Rupiah = (buy − sell) × close sesi
 * (join StockPrice sessionDate). Cukup filter universe aktif supaya delisted
 * tidak muncul; asing memang bermain di big-caps.
 */
const FOREIGN_MAX = 10;

async function getForeignFlow(sessionDate: Date): Promise<{ netBuy: PasarForeignItem[]; netSell: PasarForeignItem[] }> {
  const rows = await prisma.foreignFlow.findMany({
    where: {
      date: sessionDate,
      stock: { isActive: true, assetClass: "EQUITY" },
    },
    include: { stock: { select: { ticker: true, name: true } } },
    take: 1000,
  });
  // Close sesi untuk konversi lembar → Rupiah (satu batch query).
  const ids = rows.map((r) => r.stockId);
  const prices = await prisma.stockPrice.findMany({
    where: { stockId: { in: ids }, date: sessionDate },
    select: { stockId: true, close: true },
  });
  const closeByStock = new Map<number, number>();
  for (const p of prices) {
    const c = decimalToNumber(p.close);
    if (c !== null) closeByStock.set(p.stockId, c);
  }
  const items = rows
    .map((r) => {
      const buy = decimalToNumber(r.foreignBuy) ?? 0;
      const sell = decimalToNumber(r.foreignSell) ?? 0;
      const close = closeByStock.get(r.stockId);
      if (close === undefined) return null; // tanpa harga sesi → tidak bisa dinilai Rp
      return { ticker: r.stock.ticker, name: r.stock.name, netValue: (buy - sell) * close };
    })
    .filter((x): x is PasarForeignItem => x !== null && x.netValue !== 0)
    .sort((a, b) => b.netValue - a.netValue);
  return {
    netBuy: items.slice(0, FOREIGN_MAX),
    netSell: items.slice(-FOREIGN_MAX).reverse(),
  };
}

/**
 * Top-20 skor sinyal harian (owner-directed 24 Okt, usp-2026-10-24-02 — pola
 * "Skor Komposit" indostock, dibangun dari skor sinyal teknikal sendiri).
 * Ranking penuh universe non-gorengan + liquidity floor nilai transaksi
 * ≥ Rp1 miliar (sama dengan watchlist) — bukan filtered watchlist, jadi
 * emiten tanpa sinyal "segar" tetap bisa masuk kalau skornya tinggi.
 * Satu query indikator + satu batch harga terakhir (pola N+1-safe watchlist).
 */
const TOP_SIGNALS_MAX = 20;

async function getTopSignals(sessionDate: Date): Promise<PasarTopSignal[]> {
  const rows = await prisma.stockIndicator.findMany({
    where: {
      interval: INTERVAL.DAY,
      date: sessionDate,
      isGorengan: { not: true },
      stock: { isActive: true, assetClass: "EQUITY" },
      signalScore: { not: null },
    },
    include: { stock: { select: { ticker: true, name: true } } },
    orderBy: [{ signalScore: "desc" }],
    take: 60,
  });

  // Batch latest close+volume+prev untuk kandidat (hindari N+1 per row).
  const stockIds = rows.map((r) => r.stockId);
  const priceRows = await prisma.stockPrice.findMany({
    where: { stockId: { in: stockIds } },
    orderBy: { date: "desc" },
    // 2 baris per stock tidak bisa di Prisma take; ambil window terakhir lalu
    // kelompokkan — stockIds ≤ 60 aman.
    take: stockIds.length * 2,
    select: { stockId: true, close: true, volume: true, date: true },
  });
  const latestByStock = new Map<number, { close: number; prev: number; volume: number }>();
  const seen = new Set<number>();
  for (const p of priceRows) {
    if (seen.has(p.stockId)) continue; // first seen = latest (ordered desc)
    seen.add(p.stockId);
    const prev = priceRows.find((q) => q.stockId === p.stockId && q.date < p.date);
    const close = decimalToNumber(p.close);
    const prevClose = prev ? decimalToNumber(prev.close) : null;
    const volume = bigIntToNumber(p.volume);
    if (close === null || prevClose === null || prevClose === 0 || volume === null) continue;
    latestByStock.set(p.stockId, { close, prev: prevClose, volume });
  }

  const items: PasarTopSignal[] = [];
  for (const r of rows) {
    const px = latestByStock.get(r.stockId);
    if (!px) continue;
    if (px.close * px.volume < 1_000_000_000) continue; // liquidity floor Rp1B
    items.push({
      ticker: r.stock.ticker,
      name: r.stock.name,
      close: px.close,
      changePercent: ((px.close - px.prev) / px.prev) * 100,
      volumeShares: px.volume,
      signalScore: decimalToNumber(r.signalScore),
      signalLabel: r.signalLabel,
    });
    if (items.length >= TOP_SIGNALS_MAX) break;
  }
  return items;
}

/** Google News RSS — one query per watchlist ticker, newest first, deduped. Max 3 per ticker. */
export async function fetchWatchlistNews(tickers: string[]): Promise<PasarNewsItem[]> {
  const out: PasarNewsItem[] = [];
  const seen = new Set<string>();
  const cutoff = Date.now() - 36 * 60 * 60 * 1000; // last 36h

  const queries = tickers.slice(0, 8).map((t) => {
    const bare = t.replace(/\.JK$/, "");
    return { bare, url: `https://news.google.com/rss/search?q=${encodeURIComponent(`saham ${bare}`)}&hl=id&gl=ID&ceid=ID:id` };
  });

  await Promise.all(
    queries.map(async ({ bare, url }) => {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "teknikalid-pasar/1.0" }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const xml = await res.text();
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3);
        for (const m of items) {
          const block = m[1];
          const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
          const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
          const pub = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
          const src = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "Google News").trim();
          if (!title || !link) continue;
          if (seen.has(link)) continue;
          const ts = pub ? new Date(pub).getTime() : NaN;
          if (!Number.isNaN(ts) && ts < cutoff) continue; // skip stale
          seen.add(link);
          out.push({ ticker: bare, name: bare, title, link, source: src, pubDate: pub || null });
        }
      } catch {
        // fail-soft — news is a nice-to-have, never blocks the page
      }
    }),
  );

  out.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });
  return out.slice(0, 10);
}

// Tuning 28 Okt: micro-cache snapshot 60s (stale-while-revalidate sederhana).
// Module-scope = per-process; app single-container → efektif utk semua request.
let snapshotCache: { data: PasarSnapshot; at: number; withNews: boolean } | null = null;

export const pasarLiveService = {
  /**
   * Full /pasar snapshot — one call, deterministic ordering.
   * Tuning 28 Okt: micro-cache 60s di service-layer (halaman tetap force-dynamic).
   * ISR page-level DICOBA lalu DIBATALKAN: build gagal (prerender butuh DB) dan
   * RCA 17 Okt mencatat ISR tak beregenerasi di prod (docker standalone) — risiko
   * halaman "live" beku. Cache di sini aman: generatedAt tetap jujur, jam dari
   * WibClock client-side, dan stale ≤60s tak terasa utk data batch-sync.
   */
  async getSnapshot(withNews = true): Promise<PasarSnapshot> {
    const now = Date.now();
    if (snapshotCache && now - snapshotCache.at < 60_000 && snapshotCache.withNews === withNews) {
      return snapshotCache.data;
    }
    const data = await pasarLiveService._getSnapshotUncached(withNews);
    snapshotCache = { data, at: now, withNews };
    return data;
  },

  /** Implementation — dipisah agar cache di getSnapshot tidak rekursif. */
  async _getSnapshotUncached(withNews = true): Promise<PasarSnapshot> {
    const sessionRow = await prisma.stockPrice.findFirst({
      where: { stock: { assetClass: "EQUITY" } },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const sessionDate = sessionRow?.date ?? null;

    const ihsg = await getIhsg();
    if (!sessionDate) {
      return { ihsg, watchlist: [], topSignals: [], foreign: { netBuy: [], netSell: [] }, gainers: [], losers: [], news: [], sessionDate: null, generatedAt: new Date().toISOString() };
    }

    const [watchlist, topSignals, foreign, movers] = await Promise.all([getWatchlist(sessionDate), getTopSignals(sessionDate), getForeignFlow(sessionDate), getMovers(sessionDate)]);
    const news = withNews ? await fetchWatchlistNews(watchlist.map((w) => w.ticker)) : [];

    return {
      ihsg,
      watchlist,
      topSignals,
      foreign,
      gainers: movers.gainers,
      losers: movers.losers,
      news,
      sessionDate: sessionDate.toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
  },

  /** Previous session recap (page shown before 06:30 / off-hours): IHSG + movers of sessionDate. */
  async getYesterdayRecap(): Promise<{ ihsg: PasarIhsg; topSignals: PasarTopSignal[]; foreign: { netBuy: PasarForeignItem[]; netSell: PasarForeignItem[] }; gainers: PasarMover[]; losers: PasarMover[]; sessionDate: string | null }> {
    const ihsg = await getIhsg();
    const sessionRow = await prisma.stockPrice.findFirst({
      where: { stock: { assetClass: "EQUITY" } },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (!sessionRow) return { ihsg, topSignals: [], foreign: { netBuy: [], netSell: [] }, gainers: [], losers: [], sessionDate: null };
    const [movers, topSignals, foreign] = await Promise.all([getMovers(sessionRow.date), getTopSignals(sessionRow.date), getForeignFlow(sessionRow.date)]);
    return { ihsg, topSignals, foreign, gainers: movers.gainers, losers: movers.losers, sessionDate: sessionRow.date.toISOString().slice(0, 10) };
  },
};
