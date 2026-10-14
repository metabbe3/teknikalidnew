import { indicatorService } from "@/domains/stock/indicator.service";
import { stockRepository } from "@/domains/stock/stock.repository";

/**
 * Lengkapi context AI dari DB saat client hanya mengirim {ticker, name}
 * (kasus modal AI di halaman /stocks — data card list sengaja ringan).
 * Tanpa ini, prompt AI kosong → model mengarang angka (bug "support 8000").
 * Semua angka dari DB; high/low/close = bar terakhir untuk pivot S/R server-side.
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
  };
}
