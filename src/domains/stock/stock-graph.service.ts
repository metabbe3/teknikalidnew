import { stockRepository } from "./stock.repository";
import { INTERVAL } from "@/lib/constants";
import { decimalToNumber } from "@/lib/serialize";

export interface StockNeighbor {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  signalLabel: string | null;
  signalScore: number | null;
  isGorengan: boolean;
}

/**
 * Internal-link mesh: pick the most useful same-sector siblings to surface as
 * "Saham Terkait" on a stock detail page. Same sector already captures most
 * genuine co-movement (banks move with banks), so we deliberately do NOT compute
 * Pearson correlation — that would lean on possibly-thin price history and risk
 * self-reinforcing echo loops. Ranking is robust + cheap:
 *   1. same current verdict as the target (co-signal), then
 *   2. most active by |%change| (interesting + liquid).
 * Capped at `limit` (default 3) to keep the widget dense and the link profile clean.
 */
export async function computeNeighbors(ticker: string, limit = 3): Promise<StockNeighbor[]> {
  const stock = await stockRepository.findStockByTicker(ticker);
  if (!stock?.sector) return [];

  const [targetInd, mates] = await Promise.all([
    stockRepository.findLatestIndicator(stock.id, INTERVAL.DAY),
    stockRepository.findActiveStocksWithPrices({ sector: stock.sector, assetClass: "EQUITY" }),
  ]);
  const targetVerdict = targetInd?.signalLabel ?? null;

  const neighbors: StockNeighbor[] = [];
  for (const m of mates) {
    if (m.ticker === stock.ticker) continue; // exclude self
    const latest = m.prices[0];
    const prev = m.prices[1];
    const close = latest ? decimalToNumber(latest.close) : null;
    const prevClose = prev ? decimalToNumber(prev.close) : null;
    const change = close !== null && prevClose !== null ? close - prevClose : null;
    const changePercent = close !== null && prevClose !== null && prevClose !== 0
      ? ((close - prevClose) / prevClose) * 100
      : null;
    const ind = m.indicators[0];
    neighbors.push({
      ticker: m.ticker,
      name: m.name,
      sector: m.sector,
      close,
      change,
      changePercent,
      signalLabel: ind?.signalLabel ?? null,
      signalScore: ind ? decimalToNumber(ind.signalScore) : null,
      isGorengan: ind?.isGorengan ?? false,
    });
  }

  neighbors.sort((a, b) => {
    const aMatch = a.signalLabel && a.signalLabel === targetVerdict ? 1 : 0;
    const bMatch = b.signalLabel && b.signalLabel === targetVerdict ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return Math.abs(b.changePercent ?? -1) - Math.abs(a.changePercent ?? -1);
  });

  return neighbors.slice(0, limit);
}
