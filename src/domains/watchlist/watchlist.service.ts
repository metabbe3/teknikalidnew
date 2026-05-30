import { watchlistRepository } from "./watchlist.repository";
import { stockMarketService, type StockDetailBatchItem } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { StockAlreadyInWatchlistError, StockNotInWatchlistError } from "./watchlist.errors";

export interface WatchlistItem {
  ticker: string;
  name: string;
  sector: string;
  addedAt: Date;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;
}

type MarketData = Omit<StockDetailBatchItem, "stock">;

function buildItem(
  ticker: string,
  name: string,
  sector: string,
  addedAt: Date,
  market?: MarketData | null,
): WatchlistItem {
  return {
    ticker,
    name,
    sector,
    addedAt,
    close: market?.close ?? null,
    change: market?.change ?? null,
    changePercent: market?.changePercent ?? null,
    week52High: market?.week52High ?? null,
    week52Low: market?.week52Low ?? null,
    volume: market?.volume ?? null,
  };
}

export const watchlistService = {
  async getStatus(userId: string, ticker: string) {
    const entry = await watchlistRepository.findEntry(userId, ticker);
    return { inWatchlist: !!entry };
  },

  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    const entries = await watchlistRepository.findUserWatchlist(userId);
    if (entries.length === 0) return [];

    const batchDetails = await stockMarketService.getStockDetailsBatch(
      entries.map((e) => e.stockTicker),
    );

    return entries.map((entry) =>
      buildItem(
        entry.stockTicker,
        entry.stock.name,
        entry.stock.sector,
        entry.createdAt,
        batchDetails[entry.stockTicker] ?? null,
      ),
    );
  },

  async addToWatchlist(userId: string, ticker: string) {
    const exists = await stockMarketService.stockExists(ticker);
    if (!exists) throw new StockNotFoundError(ticker);

    const existing = await watchlistRepository.findEntry(userId, ticker);
    if (existing) throw new StockAlreadyInWatchlistError(ticker);

    return watchlistRepository.createEntry(userId, ticker);
  },

  async removeFromWatchlist(userId: string, ticker: string) {
    const entry = await watchlistRepository.findEntry(userId, ticker);
    if (!entry) throw new StockNotInWatchlistError(ticker);

    return watchlistRepository.deleteEntry(userId, ticker);
  },

  getAllWatchlistTickers() {
    return watchlistRepository.findAllWatchlistTickers();
  },
};
