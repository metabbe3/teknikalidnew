import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { INTERVAL } from "@/lib/constants";
import { toDateKey } from "@/lib/utils";

export const stockRepository = {
  // ── Stock ──

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
              { rsi14: { lte: 30 } },
              { AND: [{ stochK: { lte: 20 } }, { stochD: { lte: 20 } }] },
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
    return prisma.stockPrice.findMany({
      where: { stock: { ticker, isActive: true }, ...where },
      orderBy: { date: "asc" },
    }).then((rows) => {
      const seen = new Map<string, (typeof rows)[number]>();
      for (const row of rows) {
        seen.set(toDateKey(row.date), row);
      }
      return [...seen.values()];
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
      data,
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
      JOIN "StockPrice" sp ON sp."stockId" = s.id AND sp.date = sf.date
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
      JOIN "StockPrice" sp ON sp."stockId" = s.id AND sp.date = sf.date
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
      JOIN "StockPrice" sp ON sp."stockId" = s.id AND sp.date = sf.date
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
      JOIN "StockPrice" sp ON sp."stockId" = s.id AND sp.date = sf.date
      WHERE sf.date = ${latestDate} AND s."isActive" = true
        AND sf.pe IS NOT NULL AND sf.pe > 0 AND sf.pe < 20
        AND sf.eps IS NOT NULL
      ORDER BY sf.eps DESC
    `;
  },
};
