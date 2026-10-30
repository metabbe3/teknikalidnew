import { indicatorService } from "@/domains/stock/indicator.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { getAraArbLimits } from "@/domains/stock/idx-rules";
import { prisma } from "@/lib/prisma";

/**
 * Lengkapi context AI dari DB saat client hanya mengirim {ticker, name}
 * (kasus modal AI di halaman /stocks — data card list sengaja ringan).
 * Tanpa ini, prompt AI kosong → model mengarang angka (bug "support 8000").
 * Semua angka dari DB; high/low/close = bar terakhir untuk pivot S/R server-side.
 *
 * Enrichment 30 Okt (owner: AI harus bisa jawab "layak dibeli?" dsb):
 * + fundamental (PE/PB/EPS/DY), foreign flow 5 sesi, artikel ber-ticker terbaru.
 */
export async function buildStockAiContext(ticker: string): Promise<Record<string, unknown>> {
  const stock = await stockRepository.findStockByTicker(ticker);
  if (!stock) return {};

  const prices = await stockRepository.findPricesByTicker(ticker, {
    date: { gte: new Date(Date.now() - 260 * 86400_000) },
  });
  if (prices.length === 0) return {};

  const sorted = [...prices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const last = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : last;

  const closes = sorted.map((p) => Number(p.close));
  const highs = sorted.map((p) => Number(p.high));
  const lows = sorted.map((p) => Number(p.low));
  const volumes = sorted.map((p) => Number(p.volume));

  // Indikator inti via service (satu implementasi, konsisten dgn chart)
  let ind: Awaited<ReturnType<typeof indicatorService.getIndicatorSeries>> | null = null;
  try {
    ind = await indicatorService.getIndicatorSeries(ticker, 260);
  } catch {
    ind = null;
  }

  const close = Number(last.close);
  const prevClose = Number(prev.close);
  const avgVol20 =
    volumes.length > 20
      ? volumes.slice(-21, -1).reduce((s, v) => s + v, 0) / 20
      : volumes.reduce((s, v) => s + v, 0) / Math.max(1, volumes.length);

  const high52 = highs.length ? Math.max(...highs) : null;
  const low52 = lows.length ? Math.min(...lows) : null;

  const change5d =
    closes.length > 5 && closes[closes.length - 6] > 0
      ? ((close - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
      : null;
  const change20d =
    closes.length > 20 && closes[closes.length - 21] > 0
      ? ((close - closes[closes.length - 21]) / closes[closes.length - 21]) * 100
      : null;

  const lastOf = (arr: (number | null)[] | undefined): number | null =>
    arr && arr.length ? (arr[arr.length - 1] ?? null) : null;

  // ─── Enrichment (owner 30 Okt): fundamental + foreign flow + artikel ──────
  // + P0 riset Argon: signalScore/isGorengan/ATR/VWAP/supertrend dari StockIndicator terakhir
  const [fundamental, foreignFlows, articles, lastIndicator, lastDividend] = await Promise.all([
    prisma.stockFundamental.findFirst({
      where: { stockId: stock.id },
      orderBy: { date: "desc" },
      select: { pe: true, pb: true, eps: true, dividendYield: true, marketCap: true, beta: true, date: true },
    }).catch(() => null),
    prisma.foreignFlow.findMany({
      where: { stockId: stock.id },
      orderBy: { date: "desc" },
      take: 5,
      select: { date: true, foreignBuy: true, foreignSell: true },
    }).catch(() => []),
    prisma.article.findMany({
      where: { tickerTag: { startsWith: ticker.replace(/\.JK$/i, "") }, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { title: true, slug: true, publishedAt: true },
    }).catch(() => []),
    prisma.stockIndicator.findFirst({
      where: { stockId: stock.id },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: { signalScore: true, signalLabel: true, isGorengan: true, atr: true, vwap: true, supertrend: true },
    }).catch(() => null),
    prisma.stockDividend.findFirst({
      where: { stockId: stock.id },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      select: { year: true, type: true, amount: true, cumDate: true, exDate: true, paymentDate: true },
    }).catch(() => null),
  ]);

  const ffNet = foreignFlows.map((f) => ({
    date: f.date instanceof Date ? f.date.toISOString().slice(0, 10) : String(f.date).slice(0, 10),
    net: Number(f.foreignBuy) - Number(f.foreignSell),
  }));
  const ffNet5 = ffNet.reduce((s, f) => s + f.net, 0);
  const ffState =
    ffNet.length === 0 ? null
    : ffNet5 > 0 ? "net-buy (akumulasi asing)"
    : ffNet5 < 0 ? "net-sell (distribusi asing)"
    : "netral";

  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector ?? null,
    close,
    prevClose,
    changePercent: prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0,
    high: Number(last.high),
    low: Number(last.low),
    open: Number(last.open),
    volume: Number(last.volume),
    avgVol20: Math.round(avgVol20),
    rsi14: ind ? lastOf(ind.rsi14) : null,
    macdHist: ind ? lastOf(ind.macd?.histogram) : null,
    sma20: ind ? lastOf(ind.sma20) : null,
    sma50: ind ? lastOf(ind.sma50) : null,
    sma200: ind ? lastOf(ind.sma200) : null,
    bbUpper: ind ? lastOf(ind.bb?.upper) : null,
    bbLower: ind ? lastOf(ind.bb?.lower) : null,
    adx: ind ? (ind.adx && ind.adx.length ? ind.adx[ind.adx.length - 1] : null) : null,
    obvTrend: ind?.obvTrend ?? null,
    high52,
    low52,
    change5d,
    change20d,
    // ─── Enrichment ───
    signalScore: lastIndicator?.signalScore != null ? Number(lastIndicator.signalScore) : null,
    signalLabelAi: lastIndicator?.signalLabel ?? null,
    isGorengan: lastIndicator?.isGorengan ?? null,
    atr: lastIndicator?.atr != null ? Number(lastIndicator.atr) : null,
    vwap: lastIndicator?.vwap != null ? Number(lastIndicator.vwap) : null,
    supertrend: lastIndicator?.supertrend != null ? Number(lastIndicator.supertrend) : null,
    araArbHariIni: (() => {
      if (!prevClose || prevClose <= 0) return null;
      const { ara, arb } = getAraArbLimits(prevClose);
      return { ara, arb, basisPrevClose: prevClose };
    })(),
    lotCostRp: close > 0 ? Math.round(close * 100) : null,
    listingBoard: stock.listingBoard ?? null,
    isSyariah: stock.isSyariah ?? null, // null = belum disinkron ISSI — AI wajib redirect cek DES OJK
    listingDate: stock.listingDate instanceof Date ? stock.listingDate.toISOString().slice(0, 10) : null,
    dividenTerakhir: lastDividend
      ? {
          tahun: lastDividend.year ?? null,
          tipe: lastDividend.type ?? null,
          amountPerLembar: lastDividend.amount != null ? Number(lastDividend.amount) : null,
          cumDate: lastDividend.cumDate instanceof Date ? lastDividend.cumDate.toISOString().slice(0, 10) : null,
          exDate: lastDividend.exDate instanceof Date ? lastDividend.exDate.toISOString().slice(0, 10) : null,
        }
      : null,
    fundamental: fundamental
      ? {
          pe: fundamental.pe != null ? Number(fundamental.pe) : null,
          pb: fundamental.pb != null ? Number(fundamental.pb) : null,
          eps: fundamental.eps != null ? Number(fundamental.eps) : null,
          dividendYield: fundamental.dividendYield != null ? Number(fundamental.dividendYield) : null,
          marketCapRpT: fundamental.marketCap != null ? Number(fundamental.marketCap) / 1e12 : null,
          beta: fundamental.beta != null ? Number(fundamental.beta) : null,
          perDate: fundamental.date instanceof Date ? fundamental.date.toISOString().slice(0, 10) : null,
        }
      : null,
    foreignFlow5: ffNet.length ? { sesi: ffNet, total5: ffNet5, state: ffState } : null,
    recentArticles: articles.map((a) => ({
      title: a.title,
      slug: a.slug,
      tanggal: a.publishedAt instanceof Date ? a.publishedAt.toISOString().slice(0, 10) : null,
    })),
  };
}
