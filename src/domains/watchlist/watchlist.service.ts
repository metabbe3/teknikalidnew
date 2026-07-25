import { watchlistRepository } from "./watchlist.repository";
import { stockMarketService, type StockDetailBatchItem } from "@/domains/stock/stock-market.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { StockAlreadyInWatchlistError, StockNotInWatchlistError } from "./watchlist.errors";
import { ValidationError } from "@/lib/common-errors";

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

  async addBatch(userId: string, tickers: string[]) {
    if (!tickers || tickers.length === 0) {
      throw new ValidationError("Tickers array is required and must not be empty");
    }

    // Validate all tickers exist by fetching them from stock domain
    const existingStocks = await stockRepository.findStocksByTickers(tickers);
    const validTickers = existingStocks.map(s => s.ticker);

    if (validTickers.length === 0) {
      throw new StockNotFoundError(tickers.join(", "));
    }

    const result = await watchlistRepository.createManyEntries(userId, validTickers);
    return { added: result.count };
  },

  async removeBatch(userId: string, tickers: string[]) {
    if (!tickers || tickers.length === 0) {
      throw new ValidationError("Tickers array is required and must not be empty");
    }

    const result = await watchlistRepository.deleteManyEntries(userId, tickers);
    return { removed: result.count };
  },

  getWatchlistTickers(userId: string): Promise<string[]> {
    return watchlistRepository
      .findUserWatchlist(userId)
      .then((rows) => rows.map((r) => r.stockTicker));
  },

  getAllWatchlistTickers() {
    return watchlistRepository.findAllWatchlistTickers();
  },
};
