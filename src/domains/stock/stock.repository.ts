import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { INTERVAL } from "@/lib/constants";
import { toDateKey } from "@/lib/utils";

export const stockRepository = {
  // ── Stock ──

  findStockByTicker(ticker: string) {
    return prisma.stock.findUnique({ where: { ticker } });
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

  findActiveStocksWithPrices(where?: { sector?: string }, includeIndicators = true) {
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

  findOversoldStocks() {
    return prisma.stock.findMany({
      where: {
        isActive: true,
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

  getSparklineData(since: Date) {
    return prisma.stockPrice.findMany({
      where: { stock: { isActive: true }, date: { gte: since } },
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

  getLatestIndicatorDate() {
    return prisma.stockIndicator.findFirst({
      where: { interval: INTERVAL.DAY },
      orderBy: { date: "desc" },
      select: { date: true },
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

  findVolumeSpikes(latestDate: Date, multiplier: number) {
    const twentyDaysAgo = new Date(latestDate);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    return prisma.$queryRaw<
      { ticker: string; name: string; sector: string; close: number; prev_close: number | null; change_percent: number; volume: bigint; rsi14: number | null; sma20: number | null }[]
    >`
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
        FROM "StockPrice" WHERE date >= ${twentyDaysAgo}
        GROUP BY "stockId"
      ) avg ON avg."stockId" = s.id
      WHERE si.interval = '1d' AND si.date = ${latestDate} AND s."isActive" = true
        AND sp_latest.volume > avg.avg_volume * ${multiplier}
    `;
  },

  findHypeAlerts(latestDate: Date) {
    const twentyDaysAgo = new Date(latestDate);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    return prisma.$queryRaw<
      { ticker: string; name: string; sector: string; close: number; prev_close: number | null; volume: bigint; avg_volume: bigint; rsi14: number | null }[]
    >`
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
        FROM "StockPrice" WHERE date >= ${twentyDaysAgo}
        GROUP BY "stockId"
      ) avg ON avg."stockId" = s.id
      WHERE si.interval = '1d' AND si.date = ${latestDate} AND s."isActive" = true AND si.rsi14 > 70
    `;
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
