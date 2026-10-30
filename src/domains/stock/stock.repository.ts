import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { INTERVAL } from "@/lib/constants";
import { toDateKey } from "@/lib/utils";

/** Row findMovementMovers — dipakai movement-analysis (article domain). */
export interface MovementMoverRow {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  prevClose: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume5d: number | null;
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  adx: number | null;
  supertrend: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  signalLabel: string | null;
  signalScore: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  eps: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  isGorengan: boolean | null;
}

export const stockRepository = {
  // ── Stock ──

  /** Tanggal bar EOD terbaru level pasar (basis sesi terakhir untuk stale-badge saham). */
  findLatestPriceDate,
  // Crypto tickers are stored bare (BTC, ETH, …); IDX with .JK suffix.
  // Try exact first (crypto), fall back to .JK (IDX) — works for any coin without a static set.
  // The .JK-strip fallback catches crypto tickers the proxy canonicalized to {TICKER}.JK.
  async findStockByTicker(ticker: string) {
    const t = ticker.trim().toUpperCase();
    const exact = await prisma.stock.findUnique({ where: { ticker: t } });
    if (exact) return exact;
    const withSuffix = t.endsWith(".JK") ? t : `${t}.JK`;
    const jkd = await prisma.stock.findUnique({ where: { ticker: withSuffix } });
    if (jkd) return jkd;
    if (t.endsWith(".JK")) {
      return prisma.stock.findUnique({ where: { ticker: t.replace(/\.JK$/, "") } });
    }
    return null;
  },

  findStocksByTickers(tickers: string[]) {
    if (tickers.length === 0) return Promise.resolve([]);
    return prisma.stock.findMany({
      where: { ticker: { in: tickers }, isActive: true },
      include: {
        prices: { orderBy: { date: "desc" }, take: 6 },
      },
    });
  },

  findStocksByTickersWithIndicators(tickers: string[]) {
    if (tickers.length === 0) return Promise.resolve([]);
    return prisma.stock.findMany({
      where: { ticker: { in: tickers }, isActive: true },
      include: {
        prices: { orderBy: { date: "desc" }, take: 6 },
        indicators: { orderBy: { date: "desc" }, take: 1, where: { interval: INTERVAL.DAY } },
      },
    });
  },

  // Latest 2 daily indicators + latest 2 closes for day-over-day delta (morning-delta card)
  // All active crypto stocks with latest 2 closes + latest indicator (for /crypto list).
  findCryptoStocksWithIndicators() {
    return prisma.stock.findMany({
      where: { assetClass: "CRYPTO", isActive: true },
      orderBy: { ticker: "asc" },
      include: {
        prices: { orderBy: { date: "desc" }, take: 2, select: { close: true } },
        indicators: {
          orderBy: { date: "desc" },
          take: 1,
          where: { interval: INTERVAL.DAY },
          select: { signalLabel: true, signalScore: true, rsi14: true },
        },
      },
    });
  },

  // fix-2026-10-26-12 item(3): morning-delta change% HARUS pakai prev-close
  // doctrine-1 (per-stock last close STRICTLY sebelum bar terakhir, JOIN
  // LATERAL) — bukan "baris kedua array" (prices[1]) yang bisa salah ambil
  // carry-forward vol=0 sebagai prev utk saham yang baru trade lagi.
  findStocksWithIndicatorHistoryLateral(tickers: string[]): Promise<
    {
      ticker: string; name: string;
      indicators: { date: Date; signalLabel: string | null; macdHist: unknown; smaCrossSignal: string | null; emaCrossSignal: string | null }[];
      close: number | null; prevClose: number | null;
    }[]
  > {
    if (tickers.length === 0) return Promise.resolve([]);
    return prisma.$queryRaw`
      SELECT s.ticker, s.name,
             lb.close::float8 AS close,
             p.close::float8 AS "prevClose",
             jsonb_agg(
               jsonb_build_object(
                 'date', si.date, 'signalLabel', si."signalLabel", 'macdHist', si."macdHist",
                 'smaCrossSignal', si."smaCrossSignal", 'emaCrossSignal', si."emaCrossSignal"
               ) ORDER BY si.date DESC
             ) FILTER (WHERE si.id IS NOT NULL) AS indicators
      FROM "Stock" s
      JOIN "StockPrice" lb ON lb.id = (
        SELECT id FROM "StockPrice" WHERE "stockId" = s.id ORDER BY date DESC LIMIT 1
      )
      LEFT JOIN LATERAL (
        SELECT close FROM "StockPrice" WHERE "stockId" = s.id AND date < lb.date ORDER BY date DESC LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT si.id, si.date, si."signalLabel", si."macdHist", si."smaCrossSignal", si."emaCrossSignal"
        FROM "StockIndicator" si
        WHERE si."stockId" = s.id AND si.interval = ${INTERVAL.DAY}
        ORDER BY si.date DESC LIMIT 2
      ) si ON true
      WHERE s.ticker IN (${Prisma.join(tickers)}) AND s."isActive" = true
      GROUP BY s.ticker, s.name, lb.close, p.close
    `.then((rows) => {
      type Raw = { ticker: string; name: string; close: number | null; prevClose: number | null; indicators: unknown };
      return (rows as unknown as Raw[]).map((r) => ({
        ticker: r.ticker,
        name: r.name,
        close: r.close == null ? null : Number(r.close),
        prevClose: r.prevClose == null ? null : Number(r.prevClose),
        indicators: Array.isArray(r.indicators)
          ? (r.indicators as { date: Date; signalLabel: string | null; macdHist: unknown; smaCrossSignal: string | null; emaCrossSignal: string | null }[])
          : [],
      }));
    });
  },

  findStocksWithIndicatorHistory(tickers: string[]) {
    if (tickers.length === 0) return Promise.resolve([]);
    return prisma.stock.findMany({
      where: { ticker: { in: tickers }, isActive: true },
      select: {
        ticker: true,
        name: true,
        prices: { orderBy: { date: "desc" }, take: 2, select: { close: true } },
        indicators: {
          orderBy: { date: "desc" },
          take: 2,
          where: { interval: INTERVAL.DAY },
          select: {
            date: true,
            signalLabel: true,
            macdHist: true,
            smaCrossSignal: true,
            emaCrossSignal: true,
          },
        },
      },
    });
  },

  findStockIdsByTickers(tickers: string[]) {
    if (tickers.length === 0) return Promise.resolve([]);
    return prisma.stock.findMany({
      where: { ticker: { in: tickers }, isActive: true },
      select: { id: true, ticker: true },
    });
  },

  findActiveStocks(where?: { sector?: string }) {
    return prisma.stock.findMany({
      where: { isActive: true, ...where },
      orderBy: { ticker: "asc" },
    });
  },

  findAllStocks() {
    return prisma.stock.findMany({ orderBy: { ticker: "asc" } });
  },

  /** Universe trust utk halaman agregat (market-structure, dsb): N saham equity terlikuid
   *  di sesi terakhir — bar terakhir HARUS volume > 0 (beku/suspend/carry-forward terkecualikan). */
  async findMostLiquidEquities(take: number, latestDate?: Date): Promise<
    { ticker: string; name: string; close: number | null; volume: number | null }[]
  > {
    const date = latestDate ?? (await this.findLatestPriceDate()) ?? new Date();
    const rows = await prisma.stock.findMany({
      where: { isActive: true, assetClass: "EQUITY" },
      select: {
        ticker: true,
        name: true,
        prices: {
          where: { date, volume: { gt: 0 } },
          select: { close: true, volume: true },
          take: 1,
        },
      },
    });
    return rows
      .filter((r) => r.prices.length > 0)
      .map((r) => ({
        ticker: r.ticker,
        name: r.name,
        close: r.prices[0].close != null ? Number(r.prices[0].close) : null,
        volume: r.prices[0].volume != null ? Number(r.prices[0].volume) : null,
      }))
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, take);
  },

  findActiveStocksWithPrices(where?: { sector?: string; assetClass?: "EQUITY" | "CRYPTO" }, includeIndicators = true) {
    return prisma.stock.findMany({
      where: { isActive: true, ...where },
      orderBy: { ticker: "asc" },
      include: {
        prices: { where: { volume: { gt: 0 } }, orderBy: { date: "desc" }, take: 6 },
        ...(includeIndicators ? {
          indicators: { orderBy: { date: "desc" }, take: 1, where: { interval: INTERVAL.DAY } },
        } : {}),
      },
    });
  },

  findOversoldStocks(assetClass?: "EQUITY" | "CRYPTO") {
    return prisma.stock.findMany({
      where: {
        isActive: true,
        ...(assetClass ? { assetClass } : {}),
        indicators: {
          some: {
            interval: INTERVAL.DAY,
            OR: [
              // bug-2026-10-25-01: gt 0 — nilai 0 = indikator kosong (SUPR.JK
              // tampil RSI 0.0 di radar), bukan oversold sungguhan.
              { rsi14: { gt: 0, lte: 30 } },
              { AND: [{ stochK: { gt: 0, lte: 20 } }, { stochD: { gt: 0, lte: 20 } }] },
            ],
          },
        },
      },
      orderBy: { ticker: "asc" },
      include: {
        prices: { orderBy: { date: "desc" }, take: 6 },
        indicators: { orderBy: { date: "desc" }, take: 1, where: { interval: INTERVAL.DAY } },
      },
    });
  },

  // ── StockPrice reads ──

  findPrices(stockId: number, opts: { orderBy: "asc" | "desc"; take: number; where?: object }) {
    return prisma.stockPrice.findMany({
      where: { stockId, ...opts.where },
      orderBy: { date: opts.orderBy },
      take: opts.take,
    });
  },

  findPricesByTicker(ticker: string, where: Prisma.StockPriceWhereInput) {
    // normalisasi ticker kanonik (BBCA → BBCA.JK) — sama dgn findStockByTicker,
    // mencegah context AI kosong saat client kirim ticker tanpa suffix (bug 30 Okt)
    const t = ticker.trim().toUpperCase();
    const canonical = t.endsWith(".JK") ? t : `${t}.JK`;
    return prisma.stockPrice.findMany({
      where: { stock: { ticker: { in: [t, canonical] }, isActive: true }, ...where },
      orderBy: { date: "asc" },
    }).then((rows) => {
      const seen = new Map<string, (typeof rows)[number]>();
      for (const row of rows) {
        seen.set(toDateKey(row.date), row);
      }
      return [...seen.values()];
    });
  },

  // ── fix-2026-10-26-12: reads pasar-live via SATU PINTU repository ──

  /** Kandidat watchlist pasar-live: indikator sesi terakhir dgn sinyal segar / RSI<32 (order skor DESC). */
  findFreshSignalCandidates(sessionDate: Date, freshSince: Date, take: number) {
    return prisma.stockIndicator.findMany({
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
      take,
    });
  },

  /** Top-signal rows utk /pasar skor komposit (order signalScore DESC). */
  findTopSignalRows(sessionDate: Date, take: number) {
    return prisma.stockIndicator.findMany({
      where: {
        interval: INTERVAL.DAY,
        date: sessionDate,
        isGorengan: { not: true },
        stock: { isActive: true, assetClass: "EQUITY" },
        signalScore: { not: null },
      },
      include: { stock: { select: { ticker: true, name: true } } },
      orderBy: [{ signalScore: "desc" }],
      take,
    });
  },

  /** ForeignFlow sesi terakhir, universe aktif (usp-2026-10-24-04). */
  findForeignFlowsByDate(sessionDate: Date, take: number) {
    return prisma.foreignFlow.findMany({
      where: {
        date: sessionDate,
        stock: { isActive: true, assetClass: "EQUITY" },
      },
      include: { stock: { select: { ticker: true, name: true } } },
      take,
    });
  },

  /** Close per stockId pada tanggal sesi (map; stock tanpa bar sesi absen). */
  async findClosesByStockIdsAndDate(stockIds: number[], sessionDate: Date): Promise<Map<number, number>> {
    if (stockIds.length === 0) return new Map();
    const rows = await prisma.stockPrice.findMany({
      where: { stockId: { in: stockIds }, date: sessionDate },
      select: { stockId: true, close: true },
    });
    const map = new Map<number, number>();
    for (const r of rows) {
      const c = r.close == null ? null : Number(r.close);
      if (c !== null) map.set(r.stockId, c);
    }
    return map;
  },

  /** Tanggal bar EOD terbaru khusus EQUITY aktif (session /pasar). */
  async findLatestEquityPriceDate(): Promise<Date | null> {
    const row = await prisma.stockPrice.findFirst({
      where: { stock: { assetClass: "EQUITY", isActive: true } },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    return row?.date ?? null;
  },

  // ── fix-2026-10-26-12: batch read harga utk pasar-live (N+1 killer) ──
  // Latest bar + per-stock prev-close (STRICTLY sebelum bar itu, doctrine-1
  // market-snapshot) untuk daftar stockId — SATU query JOIN LATERAL, bukan
  // loop ≤120 findMany per ticker. Kolom NULL-toleran: saham tanpa prev bar
  // tetap dikembalikan (prevClose null) supaya caller bisa skip eksplisit.
  findLatestBarsWithPrev(stockIds: number[]): Promise<
    Map<number, { close: number | null; prevClose: number | null; volume: number | null; date: Date }>
  > {
    if (stockIds.length === 0) return Promise.resolve(new Map());
    return prisma.$queryRaw<
      { stockId: number; close: number | null; prevClose: number | null; volume: number | null; date: Date }[]
    >`
      SELECT lb."stockId", lb.close::float8 AS close, p.close::float8 AS "prevClose", lb.volume::float8 AS volume, lb.date
      FROM "StockPrice" lb
      JOIN LATERAL (
        SELECT close FROM "StockPrice"
        WHERE "stockId" = lb."stockId" AND date < lb.date
        ORDER BY date DESC LIMIT 1
      ) p ON true
      WHERE lb.id IN (
        SELECT DISTINCT ON ("stockId") id FROM "StockPrice"
        WHERE "stockId" IN (${Prisma.join(stockIds)})
        ORDER BY "stockId", date DESC
      )
    `.then((rows) => {
      const map = new Map<number, { close: number | null; prevClose: number | null; volume: number | null; date: Date }>();
      for (const r of rows) {
        map.set(Number(r.stockId), {
          close: r.close == null ? null : Number(r.close),
          prevClose: r.prevClose == null ? null : Number(r.prevClose),
          volume: r.volume == null ? null : Number(r.volume),
          date: r.date,
        });
      }
      return map;
    });
  },

  findLatestPrices(stockId: number, take: number) {
    return prisma.stockPrice.findMany({
      where: { stockId },
      orderBy: { date: "desc" },
      take,
    });
  },

  findLatestTradingPrices(stockId: number, take: number) {
    return prisma.stockPrice.findMany({
      where: { stockId, volume: { gt: 0 } },
      orderBy: { date: "desc" },
      take: take * 3,
    });
  },

  getWeek52HighLow(stockId: number) {
    return prisma.stockPrice.aggregate({
      where: { stockId, date: { gte: subDays(new Date(), 365) } },
      _max: { high: true },
      _min: { low: true },
    });
  },

  /**
   * Top movers hari ini untuk movement-analysis (article domain) — SATU PINTU
   * (fix-2026-10-26-11: SQL pindah dari movement-analysis.service, prisma
   * langsung di service = 0). 52w high/low ikut terhitung di CTE yang sama —
   * menghapus enrich loop N+1 (2 query × ≤50 mover per batch).
   */
  async findMovementMovers(minChangePercent: number, limitCount: number): Promise<MovementMoverRow[]> {
    const yesterday = subDays(new Date(), 1);
    const rows = await prisma.$queryRaw<MovementMoverRow[]>`
      WITH latest_prices AS (
        SELECT DISTINCT ON (sp."stockId")
          sp."stockId",
          sp.close,
          sp.volume,
          sp.high,
          sp.low,
          sp.open,
          sp.date
        FROM "StockPrice" sp
        WHERE sp.date >= ${subDays(new Date(), 7)}
        ORDER BY sp."stockId", sp.date DESC
      ),
      prev_prices AS (
        SELECT DISTINCT ON (sp."stockId")
          sp."stockId",
          sp.close AS prev_close
        FROM "StockPrice" sp
        WHERE sp.date >= ${subDays(new Date(), 10)}
          AND sp.date < ${yesterday}
        ORDER BY sp."stockId", sp.date DESC
      ),
      avg_volumes AS (
        SELECT
          sp."stockId",
          AVG(sp.volume)::float8 AS avg_volume_5d
        FROM "StockPrice" sp
        WHERE sp.date >= ${subDays(new Date(), 7)}
        GROUP BY sp."stockId"
      ),
      week52 AS (
        SELECT
          sp."stockId",
          MAX(sp.high)::float8 AS high52,
          MIN(sp.low)::float8 AS low52
        FROM "StockPrice" sp
        WHERE sp.date >= ${subDays(new Date(), 365)}
        GROUP BY sp."stockId"
      )
      SELECT
        s.ticker,
        s.name,
        s.sector,
        lp.close::float8 AS "close",
        pp.prev_close::float8 AS "prevClose",
        CASE WHEN pp.prev_close IS NOT NULL AND pp.prev_close > 0
          THEN ((lp.close - pp.prev_close) / pp.prev_close * 100)::float8
          ELSE NULL END AS "changePercent",
        lp.volume::float8 AS "volume",
        av.avg_volume_5d AS "avgVolume5d",
        si."rsi14"::float8 AS "rsi14",
        si."macdHist"::float8 AS "macdHist",
        si."sma20"::float8 AS "sma20",
        si."sma50"::float8 AS "sma50",
        si."sma200"::float8 AS "sma200",
        si."adx"::float8 AS "adx",
        si."supertrend"::float8 AS "supertrend",
        si."bbUpper"::float8 AS "bbUpper",
        si."bbLower"::float8 AS "bbLower",
        si."signalLabel" AS "signalLabel",
        si."signalScore"::float8 AS "signalScore",
        si."isGorengan" AS "isGorengan",
        lp.high::float8 AS "high",
        lp.low::float8 AS "low",
        lp.open::float8 AS "open",
        f."pe"::float8 AS "pe",
        f."pb"::float8 AS "pb",
        f."marketCap"::float8 AS "marketCap",
        f."eps"::float8 AS "eps",
        f."dividendYield"::float8 AS "dividendYield",
        w.high52 AS "week52High",
        w.low52 AS "week52Low"
      FROM latest_prices lp
      JOIN "Stock" s ON s.id = lp."stockId"
      LEFT JOIN prev_prices pp ON pp."stockId" = lp."stockId"
      LEFT JOIN avg_volumes av ON av."stockId" = lp."stockId"
      LEFT JOIN week52 w ON w."stockId" = lp."stockId"
      LEFT JOIN LATERAL (
        SELECT * FROM "StockIndicator" si2
        WHERE si2."stockId" = lp."stockId" AND si2.interval = '1d'
        ORDER BY si2.date DESC LIMIT 1
      ) si ON true
      LEFT JOIN LATERAL (
        SELECT * FROM "StockFundamental" sf2
        WHERE sf2."stockId" = lp."stockId"
        ORDER BY sf2.date DESC LIMIT 1
      ) f ON true
      WHERE pp.prev_close IS NOT NULL
        AND pp.prev_close > 0
        AND ABS((lp.close - pp.prev_close) / pp.prev_close * 100) >= ${minChangePercent}
        AND s.ticker != '^JKSE'
      ORDER BY ABS((lp.close - pp.prev_close) / pp.prev_close * 100) DESC
      LIMIT ${limitCount}
    `;
    return rows;
  },

  batchGetWeek52HighLow(stockIds: number[]): Promise<Map<number, { high52: number | null; low52: number | null }>> {
    if (stockIds.length === 0) return Promise.resolve(new Map());
    const cutoff = subDays(new Date(), 365);
    return prisma.$queryRaw<
      { stockId: number; high52: number | null; low52: number | null }[]
    >`
      SELECT "stockId", MAX(high)::numeric AS "high52", MIN(low)::numeric AS "low52"
      FROM "StockPrice"
      WHERE "stockId" IN (${Prisma.join(stockIds)}) AND date >= ${cutoff}
      GROUP BY "stockId"
    `.then((rows) => {
      const map = new Map<number, { high52: number | null; low52: number | null }>();
      for (const r of rows) map.set(r.stockId, { high52: r.high52 == null ? null : Number(r.high52), low52: r.low52 == null ? null : Number(r.low52) });
      return map;
    });
  },

  batchGetYearStartPrices(stockIds: number[]): Promise<Map<number, number>> {
    if (stockIds.length === 0) return Promise.resolve(new Map());
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return prisma.$queryRaw<
      { stockId: number; close: number }[]
    >`
      SELECT DISTINCT ON ("stockId") "stockId", close::numeric
      FROM "StockPrice"
      WHERE "stockId" IN (${Prisma.join(stockIds)}) AND date >= ${yearStart}
      ORDER BY "stockId", date ASC
    `.then((rows) => new Map(rows.map((r) => [r.stockId, Number(r.close)])));
  },

  getLatestPriceDate() {
    return prisma.stockPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
  },

  // ── Harga Saham Hari Ini landing (PRD idea-2026-10-10-1) — read-only ──
  // Top rows by transaction value (close × volume, desc) for the latest EOD date,
  // with prev trading-day close for % change. Honors rule qa-30-01: ranking claims
  // come from a real DB query, never hand-computed. Fail-closed: throws to caller.
  async findTopValueTraded(limit = 15): Promise<
    { date: Date | null; rows: { ticker: string; name: string; close: number; volume: number; prevClose: number | null }[] }
  > {
    const latest = await prisma.stockPrice.findFirst({
      orderBy: { date: "desc" },
      where: { stock: { isActive: true, assetClass: "EQUITY" } },
      select: { date: true },
    });
    if (!latest) return { date: null, rows: [] };

    const dayRows = await prisma.stockPrice.findMany({
      where: { date: latest.date, stock: { isActive: true, assetClass: "EQUITY" } },
      select: {
        close: true,
        volume: true,
        stockId: true,
        stock: { select: { ticker: true, name: true } },
      },
    });

    const ranked = dayRows
      .map((r) => ({
        stockId: r.stockId,
        ticker: r.stock.ticker,
        name: r.stock.name,
        close: r.close.toNumber(),
        volume: Number(r.volume),
      }))
      .sort((a, b) => b.close * b.volume - a.close * a.volume)
      .slice(0, limit);

    if (ranked.length === 0) return { date: latest.date, rows: [] };

    // Prev trading day = latest distinct date strictly before the EOD date.
    const prevDateRow = await prisma.stockPrice.findFirst({
      orderBy: { date: "desc" },
      where: { date: { lt: latest.date }, stock: { isActive: true, assetClass: "EQUITY" } },
      select: { date: true },
    });

    const prevCloses = prevDateRow
      ? await prisma.stockPrice.findMany({
          where: { date: prevDateRow.date, stockId: { in: ranked.map((r) => r.stockId) } },
          select: { stockId: true, close: true },
        })
      : [];
    const prevCloseById = new Map(prevCloses.map((r) => [r.stockId, r.close.toNumber()]));

    return {
      date: latest.date,
      rows: ranked.map(({ stockId, ...rest }) => ({ ...rest, prevClose: prevCloseById.get(stockId) ?? null })),
    };
  },

  getSparklineData(since: Date) {
    return prisma.stockPrice.findMany({
      // EQUITY only — dormant crypto rows must not feed homepage sparklines.
      where: { stock: { isActive: true, assetClass: "EQUITY" }, date: { gte: since } },
      select: { stock: { select: { ticker: true } }, close: true },
      orderBy: { date: "asc" },
    });
  },

  // ── StockPrice writes ──

  upsertStockPrice(stockId: number, date: Date, data: { open: number; high: number; low: number; close: number; volume: bigint; adjClose?: number | null }) {
    return prisma.stockPrice.upsert({
      where: { stockId_date: { stockId, date: startOfDay(date) } },
      update: data,
      create: { stockId, date: startOfDay(date), ...data },
    });
  },

  async batchUpsertPrices(stockId: number, rows: { date: Date; open: number; high: number; low: number; close: number; volume: number; adjClose?: number | null }[]) {
    const BATCH_SIZE = 50;
    let upserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((row) => {
          const date = startOfDay(row.date);
          const data = {
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: BigInt(Math.round(row.volume)),
            adjClose: row.adjClose ?? null,
          };
          return prisma.stockPrice.upsert({
            where: { stockId_date: { stockId, date } },
            update: data,
            create: { stockId, date, ...data },
          });
        })
      );
      upserted += batch.length;
    }

    return upserted;
  },

  // ── StockIndicator reads ──

  findLatestIndicator(stockId: number, interval: string) {
    return prisma.stockIndicator.findFirst({
      where: { stockId, interval },
      orderBy: { date: "desc" },
    });
  },

  findPrevIndicator(stockId: number, interval: string) {
    return prisma.stockIndicator.findFirst({
      where: { stockId, interval },
      orderBy: { date: "desc" },
      skip: 1,
    });
  },

  findIndicatorsByDate(date: Date, where?: Prisma.StockIndicatorWhereInput) {
    return prisma.stockIndicator.findMany({
      where: { interval: INTERVAL.DAY, date, stock: { isActive: true }, ...where },
      include: {
        stock: {
          include: {
            prices: { orderBy: { date: "desc" }, take: 2 },
          },
        },
      },
    });
  },

  // ponytail: single-row reads for the dated indicator archive (/stocks/[ticker]/indikator/[date]).
  // History is per-date (StockIndicator @@unique [stockId,date,interval]) — no overwrite.
  // Range query (not exact equality) to sidestep @db.Date timezone edge cases.
  findIndicatorByStockAndDate(stockId: number, date: Date, interval: string = INTERVAL.DAY) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    return prisma.stockIndicator.findFirst({
      where: { stockId, interval, date: { gte: start, lt: end } },
    });
  },

  findPriceByStockAndDate(stockId: number, date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    return prisma.stockPrice.findFirst({
      where: { stockId, date: { gte: start, lt: end } },
    });
  },

  getLatestIndicatorDate(assetClass?: "EQUITY" | "CRYPTO") {
    return prisma.stockIndicator.findFirst({
      where: { interval: INTERVAL.DAY, ...(assetClass ? { stock: { assetClass } } : {}) },
      orderBy: { date: "desc" },
      select: { date: true },
    });
  },

  // MAX(smaCrossDate) over daily rows — SQL MAX semantics (NULLs ignored via not-null filter).
  getLatestSmaCrossDate(interval: string = INTERVAL.DAY) {
    return prisma.stockIndicator.findFirst({
      where: { interval, smaCrossDate: { not: null } },
      orderBy: { smaCrossDate: "desc" },
      select: { smaCrossDate: true },
    });
  },

  // COUNT(DISTINCT stockId) for a cross signal since `since` — Prisma count() has no
  // distinct, so fetch distinct ids and let the caller take .length (≤ stock count rows).
  findStockIdsWithCrossSignal(signal: string, since: Date, interval: string = INTERVAL.DAY) {
    return prisma.stockIndicator.findMany({
      where: { interval, smaCrossSignal: signal, smaCrossDate: { gte: since } },
      select: { stockId: true },
      distinct: ["stockId"],
    });
  },

  // ── StockIndicator writes ──

  upsertStockIndicator(stockId: number, date: Date, interval: string, data: Record<string, unknown>) {
    return prisma.stockIndicator.upsert({
      where: { stockId_date_interval: { stockId, date, interval } },
      update: data,
      create: { stockId, date, interval, ...data },
    });
  },

  updateIndicatorGorengan(stockId: number, date: Date, interval: string, isGorengan: boolean) {
    return prisma.stockIndicator.update({
      where: { stockId_date_interval: { stockId, date, interval } },
      data: { isGorengan },
    });
  },

  findLatestPrice(stockId: number) {
    return prisma.stockPrice.findFirst({
      where: { stockId },
      orderBy: { date: "desc" },
    });
  },

  findLatestMarketCap(stockId: number) {
    return prisma.stockFundamental.findFirst({
      where: { stockId },
      orderBy: { date: "desc" },
      select: { marketCap: true },
    });
  },

  async batchUpsertTodayPrices(items: { stockId: number; date: Date; open: number; high: number; low: number; close: number; volume: bigint }[]) {
    if (items.length === 0) return 0;
    await prisma.$transaction(
      items.map((item) =>
        prisma.stockPrice.upsert({
          where: { stockId_date: { stockId: item.stockId, date: startOfDay(item.date) } },
          update: { open: item.open, high: item.high, low: item.low, close: item.close, volume: item.volume },
          create: { stockId: item.stockId, date: startOfDay(item.date), open: item.open, high: item.high, low: item.low, close: item.close, volume: item.volume },
        })
      )
    );
    return items.length;
  },

  async batchUpsertIndicators(items: { stockId: number; date: Date; interval: string; data: Record<string, unknown> }[]) {
    if (items.length === 0) return 0;
    const BATCH_SIZE = 100;
    let upserted = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((item) =>
          prisma.stockIndicator.upsert({
            where: { stockId_date_interval: { stockId: item.stockId, date: item.date, interval: item.interval } },
            update: item.data,
            create: { stockId: item.stockId, date: item.date, interval: item.interval, ...item.data },
          })
        )
      );
      upserted += batch.length;
    }
    return upserted;
  },

  async batchUpsertPricesAndIndicators(
    prices: { stockId: number; date: Date; open: number; high: number; low: number; close: number; volume: bigint }[],
    indicators: { stockId: number; date: Date; interval: string; data: Record<string, unknown> }[],
  ) {
    if (prices.length === 0 && indicators.length === 0) return { prices: 0, indicators: 0 };

    const BATCH_SIZE = 100;
    const total = Math.max(prices.length, indicators.length);
    let pWritten = 0;
    let iWritten = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const pBatch = prices.slice(i, i + BATCH_SIZE);
      const iBatch = indicators.slice(i, i + BATCH_SIZE);
      await prisma.$transaction([
        ...pBatch.map((p) =>
          prisma.stockPrice.upsert({
            where: { stockId_date: { stockId: p.stockId, date: startOfDay(p.date) } },
            update: { open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume },
            create: { stockId: p.stockId, date: startOfDay(p.date), open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume },
          })
        ),
        ...iBatch.map((ind) =>
          prisma.stockIndicator.upsert({
            where: { stockId_date_interval: { stockId: ind.stockId, date: ind.date, interval: ind.interval } },
            update: ind.data,
            create: { stockId: ind.stockId, date: ind.date, interval: ind.interval, ...ind.data },
          })
        ),
      ]);
      pWritten += pBatch.length;
      iWritten += iBatch.length;
    }

    return { prices: pWritten, indicators: iWritten };
  },

  // ── StockCommissioner writes ──

  async replaceCommissioners(stockId: number, commissioners: { name: string; position: string | null; independent: boolean }[]) {
    await prisma.stockCommissioner.deleteMany({ where: { stockId } });
    if (commissioners.length === 0) return 0;
    await prisma.stockCommissioner.createMany({
      data: commissioners.map((c) => ({ stockId, ...c })),
    });
    return commissioners.length;
  },

  // ── StockDirector writes ──

  async replaceDirectors(stockId: number, directors: { name: string; position: string; type: string; independent: boolean }[]) {
    await prisma.stockDirector.deleteMany({ where: { stockId } });
    if (directors.length === 0) return 0;
    await prisma.stockDirector.createMany({
      data: directors.map((d) => ({ stockId, ...d })),
    });
    return directors.length;
  },

  // ── StockShareholder writes ──

  async replaceShareholders(stockId: number, shareholders: { name: string; type: string | null; shares: number | null; percent: number | null }[]) {
    await prisma.stockShareholder.deleteMany({ where: { stockId } });
    if (shareholders.length === 0) return 0;
    await prisma.stockShareholder.createMany({
      data: shareholders.map((s) => ({
        stockId,
        name: s.name,
        type: s.type,
        shares: s.shares,
        percent: s.percent,
      })),
    });
    return shareholders.length;
  },

  // ── Trading info writes ──

  updateTradingInfo(stockId: number, data: { listedShares?: bigint | null; foreignOwnershipPercent?: number | null; isinCode?: string | null }) {
    return prisma.stock.update({
      where: { id: stockId },
      data: {
        ...(data.listedShares !== undefined && { listedShares: data.listedShares }),
        ...(data.foreignOwnershipPercent !== undefined && { foreignOwnershipPercent: data.foreignOwnershipPercent }),
        ...(data.isinCode !== undefined && { isinCode: data.isinCode }),
      },
    });
  },

  // ── StockSubsidiary writes ──

  async replaceSubsidiaries(stockId: number, subsidiaries: { name: string; businessType: string | null; totalAssets: number | null; ownershipPercent: number | null }[]) {
    await prisma.stockSubsidiary.deleteMany({ where: { stockId } });
    if (subsidiaries.length === 0) return 0;
    await prisma.stockSubsidiary.createMany({
      data: subsidiaries.map((s) => ({
        stockId,
        name: s.name,
        businessType: s.businessType,
        totalAssets: s.totalAssets,
        ownershipPercent: s.ownershipPercent,
      })),
    });
    return subsidiaries.length;
  },

  // ── StockDividend writes ──

  async upsertDividend(stockId: number, data: { year: number; type: string; currency: string | null; amount: number | null; totalAmount: number | null; cumDate: Date | null; exDate: Date | null; recordDate: Date | null; paymentDate: Date | null }) {
    return prisma.stockDividend.upsert({
      where: { stockId_year_type: { stockId, year: data.year, type: data.type } },
      update: data,
      create: { stockId, ...data },
    });
  },

  async batchUpsertDividends(items: { stockId: number; year: number; type: string; currency: string | null; amount: number | null; totalAmount: number | null; cumDate: Date | null; exDate: Date | null; recordDate: Date | null; paymentDate: Date | null }[]) {
    if (items.length === 0) return 0;
    const BATCH_SIZE = 50;
    let upserted = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((item) =>
          prisma.stockDividend.upsert({
            where: { stockId_year_type: { stockId: item.stockId, year: item.year, type: item.type } },
            update: item,
            create: item,
          })
        )
      );
      upserted += batch.length;
    }
    return upserted;
  },

  // ── Stock profile update ──

  updateStockProfile(stockId: number, data: { industry?: string | null; subIndustry?: string | null; fax?: string | null; npwp?: string | null }) {
    return prisma.stock.update({
      where: { id: stockId },
      // Guard panjang kolom varchar (28 Okt: data IDX bisa melebihi kapasitas → throw)
      data: {
        ...(data.industry && { industry: data.industry.slice(0, 100) }),
        ...(data.subIndustry && { subIndustry: data.subIndustry.slice(0, 100) }),
        ...(data.fax && { fax: data.fax.slice(0, 50) }),
        ...(data.npwp && { npwp: data.npwp.slice(0, 50) }),
      },
    });
  },

  // ── IDX profile reads ──

  findCommissioners(stockId: number) {
    return prisma.stockCommissioner.findMany({ where: { stockId } });
  },

  findDirectors(stockId: number) {
    return prisma.stockDirector.findMany({ where: { stockId } });
  },

  findShareholders(stockId: number) {
    return prisma.stockShareholder.findMany({
      where: { stockId },
      orderBy: { percent: "desc" },
    });
  },

  findSubsidiaries(stockId: number) {
    return prisma.stockSubsidiary.findMany({
      where: { stockId },
      orderBy: { ownershipPercent: "desc" },
    });
  },

  findDividends(stockId: number) {
    return prisma.stockDividend.findMany({
      where: { stockId },
      orderBy: { year: "desc" },
    });
  },

  // ── Screener raw SQL ──

  findAvgVolumeByStockIds(stockIds: number[]): Promise<Map<number, number>> {
    if (stockIds.length === 0) return Promise.resolve(new Map());
    return prisma.$queryRaw<
      { stockId: number; avg_volume: bigint }[]
    >`
      SELECT "stockId", AVG(volume)::bigint AS avg_volume
      FROM "StockPrice"
      WHERE date >= NOW() - INTERVAL '20 days'
        AND "stockId" IN (${Prisma.join(stockIds)})
      GROUP BY "stockId"
    `.then((rows) => {
      const map = new Map<number, number>();
      for (const row of rows) map.set(row.stockId, Number(row.avg_volume));
      return map;
    });
  },

  findVolumeSpikes(latestDate: Date, multiplier: number, assetClass?: "EQUITY" | "CRYPTO") {
    const twentyDaysAgo = new Date(latestDate);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const params: (Date | number | string)[] = [twentyDaysAgo, latestDate, multiplier];
    if (assetClass) params.push(assetClass);
    return prisma.$queryRawUnsafe<
      { ticker: string; name: string; sector: string; close: number; prev_close: number | null; change_percent: number; volume: bigint; rsi14: number | null; sma20: number | null }[]
    >(`
      SELECT
        s.ticker, s.name, s.sector, sp_latest.close,
        sp_prev.close AS prev_close, sp_latest.volume, si.rsi14, si.sma20
      FROM "StockIndicator" si
      JOIN "Stock" s ON s.id = si."stockId"
      JOIN "StockPrice" sp_latest ON sp_latest."stockId" = s.id AND sp_latest.date = si.date
      LEFT JOIN LATERAL (
        SELECT close FROM "StockPrice"
        WHERE "stockId" = s.id AND date < si.date
        ORDER BY date DESC LIMIT 1
      ) sp_prev ON true
      JOIN (
        SELECT "stockId", AVG(volume)::bigint AS avg_volume
        FROM "StockPrice" WHERE date >= $1
        GROUP BY "stockId"
      ) avg ON avg."stockId" = s.id
      WHERE si.interval = '1d' AND si.date = $2 AND s."isActive" = true
        AND sp_latest.volume > avg.avg_volume * $3${assetClass ? ` AND s."assetClass" = $4` : ""}
    `, ...params);
  },

  findHypeAlerts(latestDate: Date, assetClass?: "EQUITY" | "CRYPTO") {
    const twentyDaysAgo = new Date(latestDate);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const params: (Date | string)[] = [twentyDaysAgo, latestDate];
    if (assetClass) params.push(assetClass);
    return prisma.$queryRawUnsafe<
      { ticker: string; name: string; sector: string; close: number; prev_close: number | null; volume: bigint; avg_volume: bigint; rsi14: number | null }[]
    >(`
      SELECT
        s.ticker, s.name, s.sector, sp_latest.close,
        sp_prev.close AS prev_close, sp_latest.volume, avg.avg_volume, si.rsi14
      FROM "StockIndicator" si
      JOIN "Stock" s ON s.id = si."stockId"
      JOIN "StockPrice" sp_latest ON sp_latest."stockId" = s.id AND sp_latest.date = si.date
      LEFT JOIN LATERAL (
        SELECT close FROM "StockPrice"
        WHERE "stockId" = s.id AND date < si.date
        ORDER BY date DESC LIMIT 1
      ) sp_prev ON true
      JOIN (
        SELECT "stockId", AVG(volume)::bigint AS avg_volume
        FROM "StockPrice" WHERE date >= $1
        GROUP BY "stockId"
      ) avg ON avg."stockId" = s.id
      WHERE si.interval = '1d' AND si.date = $2 AND s."isActive" = true AND si.rsi14 > 70${assetClass ? ` AND s."assetClass" = $3` : ""}
    `, ...params);
  },

  // ── Weekly market report (/laporan-pasar) reads ──
  // Window = [weekStart, weekEnd) calendar days. All equity-only.

  /** Per-stock weekly change: last traded close in window vs last close before it. */
  findWeeklyWindowChanges(weekStart: Date, weekEnd: Date) {
    return prisma.$queryRawUnsafe<
      { ticker: string; name: string; sector: string; week_close: number; prev_close: number | null }[]
    >(`
      SELECT s.ticker, s.name, s.sector, sw.close AS week_close, sp.close AS prev_close
      FROM "Stock" s
      JOIN LATERAL (
        SELECT close FROM "StockPrice"
        WHERE "stockId" = s.id AND date >= $1 AND date < $2 AND volume > 0
        ORDER BY date DESC LIMIT 1
      ) sw ON true
      LEFT JOIN LATERAL (
        SELECT close FROM "StockPrice"
        WHERE "stockId" = s.id AND date < $1
        ORDER BY date DESC LIMIT 1
      ) sp ON true
      WHERE s."isActive" = true AND s."assetClass" = 'EQUITY'
    `, weekStart, weekEnd);
  },

  /** Index (^JKSE) weekly closes: last in window + last before window. */
  findWeeklyIndexClose(weekStart: Date, weekEnd: Date) {
    return prisma.$queryRaw<
      { close_in_week: number | null; close_prev: number | null; last_date: Date | null }[]
    >`
      SELECT
        (SELECT close FROM "StockPrice" sp JOIN "Stock" s ON s.id = sp."stockId"
          WHERE s.ticker = '^JKSE' AND sp.date >= ${weekStart} AND sp.date < ${weekEnd}
          ORDER BY sp.date DESC LIMIT 1) AS close_in_week,
        (SELECT close FROM "StockPrice" sp JOIN "Stock" s ON s.id = sp."stockId"
          WHERE s.ticker = '^JKSE' AND sp.date < ${weekStart}
          ORDER BY sp.date DESC LIMIT 1) AS close_prev,
        (SELECT MAX(sp.date) FROM "StockPrice" sp JOIN "Stock" s ON s.id = sp."stockId"
          WHERE s.ticker = '^JKSE' AND sp.date >= ${weekStart} AND sp.date < ${weekEnd}) AS last_date
    `;
  },

  /** Per-stock indicator snapshot pair (in-window vs pre-window) for cross/oversold detection. */
  findWeeklyIndicatorSnapshots(weekStart: Date, weekEnd: Date) {
    return prisma.$queryRawUnsafe<
      {
        ticker: string; name: string;
        sma50: number | null; sma200: number | null; rsi14: number | null;
        prev_sma50: number | null; prev_sma200: number | null; prev_rsi14: number | null;
      }[]
    >(`
      SELECT s.ticker, s.name,
             si_curr.sma50, si_curr.sma200, si_curr.rsi14,
             si_prev.sma50 AS prev_sma50, si_prev.sma200 AS prev_sma200, si_prev.rsi14 AS prev_rsi14
      FROM "Stock" s
      JOIN LATERAL (
        SELECT sma50, sma200, rsi14 FROM "StockIndicator"
        WHERE "stockId" = s.id AND interval = '1d' AND date >= $1 AND date < $2
        ORDER BY date DESC LIMIT 1
      ) si_curr ON true
      JOIN LATERAL (
        SELECT sma50, sma200, rsi14 FROM "StockIndicator"
        WHERE "stockId" = s.id AND interval = '1d' AND date < $1
        ORDER BY date DESC LIMIT 1
      ) si_prev ON true
      WHERE s."isActive" = true AND s."assetClass" = 'EQUITY'
        AND si_curr.sma50 IS NOT NULL AND si_curr.sma200 IS NOT NULL
        AND si_prev.sma50 IS NOT NULL AND si_prev.sma200 IS NOT NULL
    `, weekStart, weekEnd);
  },

  // ── StockFundamental reads ──

  findLatestFundamental(stockId: number) {
    return prisma.stockFundamental.findFirst({
      where: { stockId },
      orderBy: { date: "desc" },
    });
  },

  // ── StockIndicator series reads ──

  findIndicatorSeries(stockId: number, startDate: Date) {
    return prisma.stockIndicator.findMany({
      where: { stockId, interval: INTERVAL.DAY, date: { gte: startDate } },
      orderBy: { date: "asc" },
    });
  },

  /** Shares outstanding implisit per saham = MEDIAN (marketCap/close) dari 45
   * baris fundamental terakhir. Provider IDX scanner tidak menyuplai share
   * count, dan marketCap provider sistemik lag (cap = shares × close(T-1),
   * terverifikasi live 20 Okt: TV BBCA cap 594,19T = 123,28 miliar × 4.820
   * [close kemarin] saat close hari ini 5.200) — implied shares per-hari jadi
   * true_shares × close(T-1)/close(T), noise simetris ~±2%/hari yang dimedian
   * habis. Validasi BBCA: median-45 = 123,31 miliar vs resmi 123,28 miliar
   * (+0,02%). Split/stock-split terdeteksi via median separuh-awal vs
   * separuh-akhir ratio >1,5 → saham di-skip (tanpa anchor). */
  async findImpliedShares(stockIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (stockIds.length === 0) return map;
    const rows = await prisma.$queryRaw<{ stockId: number; date: Date; close: number; marketCap: bigint }[]>`
      SELECT "stockId", date, close, "marketCap" FROM (
        SELECT sf."stockId" AS "stockId", sf.date AS date, sf."marketCap" AS "marketCap", sp.close AS close,
               row_number() OVER (PARTITION BY sf."stockId" ORDER BY sf.date DESC) AS rn
        FROM "StockFundamental" sf
        JOIN LATERAL (
          SELECT sp2.close AS close FROM "StockPrice" sp2
          WHERE sp2."stockId" = sf."stockId" AND sp2.date = sf.date
          LIMIT 1
        ) sp ON true
        WHERE sf."stockId" IN (${Prisma.join(stockIds)})
      ) t
      WHERE rn <= 45 AND close > 0 AND "marketCap" > 0`;
    const byStock = new Map<number, number[]>();
    for (const r of rows) {
      const sh = Number(r.marketCap) / r.close;
      if (!Number.isFinite(sh) || sh <= 0) continue;
      let arr = byStock.get(r.stockId);
      if (!arr) byStock.set(r.stockId, (arr = []));
      arr.push(sh); // urut date DESC dari query
    }
    const median = (a: number[]) => {
      const s = [...a].sort((x, y) => x - y);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    for (const [stockId, arr] of byStock) {
      if (arr.length < 8) continue; // riwayat terlalu pendek → tak bisa median
      const half = Math.floor(arr.length / 2);
      const mOld = median(arr.slice(half));      // separuh lama
      const mNew = median(arr.slice(0, half));   // separuh baru
      if (!Number.isFinite(mOld) || !Number.isFinite(mNew)) continue;
      const ratio = Math.max(mOld, mNew) / Math.min(mOld, mNew);
      if (ratio > 1.5) continue; // split/break → tanpa anchor
      map.set(stockId, median(arr));
    }
    return map;
  },

  // ── StockFundamental writes ──

  async batchUpsertFundamentals(
    items: { stockId: number; date: Date; pe: number | null; forwardPe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[],
  ) {
    if (items.length === 0) return 0;
    await prisma.$transaction(
      items.map((item) =>
        prisma.stockFundamental.upsert({
          where: { stockId_date: { stockId: item.stockId, date: startOfDay(item.date) } },
          update: { pe: item.pe, forwardPe: item.forwardPe, pb: item.pb, eps: item.eps, dividendYield: item.dividendYield, marketCap: item.marketCap },
          create: { stockId: item.stockId, date: startOfDay(item.date), pe: item.pe, forwardPe: item.forwardPe, pb: item.pb, eps: item.eps, dividendYield: item.dividendYield, marketCap: item.marketCap },
        })
      ),
    );
    return items.length;
  },

  // ── Fundamental Screener raw SQL ──

  findUndervalued(latestDate: Date) {
    return prisma.$queryRaw<
      { ticker: string; name: string; sector: string; close: number; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[]
    >`
      SELECT s.ticker, s.name, s.sector, sp.close, sf.pe, sf.pb, sf.eps, sf."dividendYield", sf."marketCap"
      FROM "StockFundamental" sf
      JOIN "Stock" s ON s.id = sf."stockId"
      JOIN LATERAL (SELECT sp2.close AS close FROM "StockPrice" sp2 WHERE sp2."stockId" = s.id ORDER BY sp2.date DESC LIMIT 1) sp ON true
      WHERE sf.date = ${latestDate} AND s."isActive" = true
        AND sf.pe IS NOT NULL AND sf.pe > 0 AND sf.pe < 15
        AND sf.pb IS NOT NULL AND sf.pb < 1.5
      ORDER BY sf.pe ASC
    `;
  },

  findHighDividend(latestDate: Date) {
    return prisma.$queryRaw<
      { ticker: string; name: string; sector: string; close: number; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[]
    >`
      SELECT s.ticker, s.name, s.sector, sp.close, sf.pe, sf.pb, sf.eps, sf."dividendYield", sf."marketCap"
      FROM "StockFundamental" sf
      JOIN "Stock" s ON s.id = sf."stockId"
      JOIN LATERAL (SELECT sp2.close AS close FROM "StockPrice" sp2 WHERE sp2."stockId" = s.id ORDER BY sp2.date DESC LIMIT 1) sp ON true
      WHERE sf.date = ${latestDate} AND s."isActive" = true
        AND sf."dividendYield" IS NOT NULL AND sf."dividendYield" > 3.0
      ORDER BY sf."dividendYield" DESC
    `;
  },

  findBlueChip(latestDate: Date) {
    return prisma.$queryRaw<
      { ticker: string; name: string; sector: string; close: number; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[]
    >`
      SELECT s.ticker, s.name, s.sector, sp.close, sf.pe, sf.pb, sf.eps, sf."dividendYield", sf."marketCap"
      FROM "StockFundamental" sf
      JOIN "Stock" s ON s.id = sf."stockId"
      JOIN LATERAL (SELECT sp2.close AS close FROM "StockPrice" sp2 WHERE sp2."stockId" = s.id ORDER BY sp2.date DESC LIMIT 1) sp ON true
      WHERE sf.date = ${latestDate} AND s."isActive" = true
        AND sf."marketCap" > 50000000000000
      ORDER BY sf."marketCap" DESC
    `;
  },

  findValueGrowth(latestDate: Date) {
    return prisma.$queryRaw<
      { ticker: string; name: string; sector: string; close: number; pe: number | null; pb: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint }[]
    >`
      SELECT s.ticker, s.name, s.sector, sp.close, sf.pe, sf.pb, sf.eps, sf."dividendYield", sf."marketCap"
      FROM "StockFundamental" sf
      JOIN "Stock" s ON s.id = sf."stockId"
      JOIN LATERAL (SELECT sp2.close AS close FROM "StockPrice" sp2 WHERE sp2."stockId" = s.id ORDER BY sp2.date DESC LIMIT 1) sp ON true
      WHERE sf.date = ${latestDate} AND s."isActive" = true
        AND sf.pe IS NOT NULL AND sf.pe > 0 AND sf.pe < 20
        AND sf.eps IS NOT NULL
      ORDER BY sf.eps DESC
    `;
  },
};

// Batch EOD prev-close: close TERAKHIR sebelum startOfToday utk daftar ticker.
// Dipakai live-quotes — prev Yahoo/TV utk saham illiquid bisa basi (bandingkan
// ke session terakhir saham itu trade, bukan kemarin) → percent bohong ±30%.
/** Tanggal bar EOD terbaru level pasar (basis sesi terakhir untuk stale-badge saham). */
export async function findLatestPriceDate(): Promise<Date | null> {
  const row = await prisma.stockPrice.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row?.date ?? null;
}

export async function findPrevClosesByTicker(tickers: string[], opts?: { includeToday?: boolean }) {
  if (tickers.length === 0) return new Map<string, number>();
  const today = startOfDay(new Date());
  const stocks = await prisma.stock.findMany({
    where: { ticker: { in: tickers } },
    select: { id: true, ticker: true },
  });
  // prev trading day = tanggal EOD terbaru < hari ini (level pasar, bukan per-saham)
  // includeToday: acuan = EOD terbaru <= hari ini (bukan < hari ini). Dipakai payload
  // CLOSED_WIB live-quotes: setelah EOD sync hari ini masuk, price yang ditampilkan
  // harus close HARI INI, bukan close kemarin (owner 26 Okt "masih tidak minus?").
  const prevDateRow = await prisma.stockPrice.findFirst({
    orderBy: { date: "desc" },
    where: opts?.includeToday ? { date: { lte: today } } : { date: { lt: today } },
    select: { date: true },
  });
  const out = new Map<string, number>();
  if (!prevDateRow) return out;
  const idByTicker = new Map(stocks.map((s) => [s.ticker, s.id]));
  // Close TERAKHIR per saham <= prevDate — saham yang tidak trade di prevDate
  // (mis. beku/ARA, tanpa bar hari itu) harus pakai close terakhirnyanya sendiri,
  // BUKAN jatuh ke fallback feed (Yahoo prev bisa basis beda → phantom ±30%, AKKU 17 Okt).
  const rows = await prisma.$queryRaw<{ stockId: number; close: unknown }[]>`
    SELECT DISTINCT ON ("stockId") "stockId", "close"
    FROM "StockPrice"
    WHERE "stockId" IN (${Prisma.join(stocks.map((s) => s.id))})
      AND date <= ${prevDateRow.date}
    ORDER BY "stockId", date DESC`;
  const closeById = new Map<number, number>();
  for (const r of rows) closeById.set(r.stockId, Number(r.close));
  const result = new Map<string, number>();
  for (const [ticker, id] of idByTicker) {
    const c = closeById.get(id);
    if (c != null) result.set(ticker, c);
  }
  return result;
}
