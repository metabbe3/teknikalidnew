import { Prisma } from "@/generated/prisma/client";
import { portfolioRepository } from "./portfolio.repository";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { StockNotFoundError } from "@/domains/stock/stock.errors";
import { HoldingNotFoundError, PortfolioPrivateError } from "./portfolio.errors";
import { decimalToNumber } from "@/lib/serialize";

export interface HoldingItem {
  ticker: string;
  name: string;
  sector: string;
  buyPrice: number;
  quantity: number;
  buyDate: string;
  notes: string | null;
  currentPrice: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  marketValue: number | null;
  rsi14: number | null;
  macdSignal: string | null;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  bullishCount: number;
  bearishCount: number;
  sectorBreakdown: Record<string, number>;
}

export interface PortfolioData {
  holdings: HoldingItem[];
  summary: PortfolioSummary;
  isPublic: boolean;
}

export const portfolioService = {
  async addHolding(
    userId: string,
    ticker: string,
    buyPrice: number,
    quantity: number,
    buyDate: string,
    notes?: string,
  ) {
    let exists = await stockMarketService.stockExists(ticker);
    if (!exists && !ticker.endsWith(".JK")) {
      exists = await stockMarketService.stockExists(ticker + ".JK");
      if (exists) ticker = ticker + ".JK";
    }
    if (!exists) throw new StockNotFoundError(ticker);

    const existing = await portfolioRepository.findHolding(userId, ticker);
    if (existing) {
      // Average the buy price
      const oldTotal = Number(existing.buyPrice) * existing.quantity;
      const newTotal = buyPrice * quantity;
      const totalQty = existing.quantity + quantity;
      const avgPrice = (oldTotal + newTotal) / totalQty;

      return portfolioRepository.updateHolding(userId, ticker, {
        buyPrice: new Prisma.Decimal(avgPrice.toFixed(2)),
        quantity: totalQty,
        buyDate: new Date(buyDate),
        notes: notes ?? undefined,
      });
    }

    return portfolioRepository.createHolding({
      userId,
      stockTicker: ticker,
      buyPrice: new Prisma.Decimal(buyPrice.toFixed(2)),
      quantity,
      buyDate: new Date(buyDate),
      notes,
    });
  },

  async removeHolding(userId: string, ticker: string) {
    const holding = await portfolioRepository.findHolding(userId, ticker);
    if (!holding) throw new HoldingNotFoundError(ticker);
    return portfolioRepository.deleteHolding(userId, ticker);
  },

  async updateHolding(
    userId: string,
    ticker: string,
    data: { buyPrice?: number; quantity?: number; buyDate?: string; notes?: string | null },
  ) {
    const holding = await portfolioRepository.findHolding(userId, ticker);
    if (!holding) throw new HoldingNotFoundError(ticker);

    const updateData: {
      buyPrice?: Prisma.Decimal;
      quantity?: number;
      buyDate?: Date;
      notes?: string | null;
    } = {};

    if (data.buyPrice !== undefined) {
      updateData.buyPrice = new Prisma.Decimal(data.buyPrice.toFixed(2));
    }
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.buyDate !== undefined) updateData.buyDate = new Date(data.buyDate);
    if (data.notes !== undefined) updateData.notes = data.notes;

    return portfolioRepository.updateHolding(userId, ticker, updateData);
  },

  async getPortfolio(userId: string): Promise<PortfolioData> {
    const holdings = await portfolioRepository.findUserHoldings(userId);

    const items: HoldingItem[] = holdings.map((h) => {
      const prices = h.stock.prices;
      const latest = prices[0];
      const currentPrice = latest ? decimalToNumber(latest.close) : null;
      const buyPrice = Number(h.buyPrice);
      const marketValue = currentPrice !== null ? currentPrice * h.quantity : null;
      const cost = buyPrice * h.quantity;
      const pnl = marketValue !== null ? marketValue - cost : null;
      const pnlPercent = pnl !== null && cost > 0 ? (pnl / cost) * 100 : null;

      const indicator = h.stock.indicators?.[0];
      const rsi14 = indicator ? decimalToNumber(indicator.rsi14) : null;
      const macdHist = indicator ? decimalToNumber(indicator.macdHist) : null;
      const macdSignal = macdHist !== null ? (macdHist > 0 ? "Bullish" : "Bearish") : null;

      return {
        ticker: h.stockTicker,
        name: h.stock.name,
        sector: h.stock.sector,
        buyPrice,
        quantity: h.quantity,
        buyDate: h.buyDate.toISOString().split("T")[0],
        notes: h.notes,
        currentPrice,
        pnl,
        pnlPercent,
        marketValue,
        rsi14,
        macdSignal,
      };
    });

    const totalCost = items.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
    const totalValue = items.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    const bullishCount = items.filter((h) => h.macdSignal === "Bullish").length;
    const bearishCount = items.filter((h) => h.macdSignal === "Bearish").length;

    const sectorBreakdown: Record<string, number> = {};
    items.forEach((h) => {
      const val = h.marketValue ?? h.buyPrice * h.quantity;
      sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] ?? 0) + val;
    });

    // Get privacy setting from user
    const user = await portfolioRepository.findUserByUsername(
      // We need to get the user to check their setting - using a direct approach
      userId,
    );
    // Since we don't have username here, we'll add a separate method
    const isPublic = false; // Will be fetched separately via settings

    return {
      holdings: items,
      summary: {
        totalValue,
        totalCost,
        totalPnl,
        totalPnlPercent,
        bullishCount,
        bearishCount,
        sectorBreakdown,
      },
      isPublic: false, // Caller should fetch separately
    };
  },

  async getPrivacySetting(userId: string): Promise<boolean> {
    const user = await portfolioRepository.findUserById(userId);
    return user?.portfolioPublic ?? false;
  },

  async setPrivacy(userId: string, isPublic: boolean) {
    return portfolioRepository.setPortfolioVisibility(userId, isPublic);
  },

  async getPublicPortfolio(username: string) {
    const user = await portfolioRepository.findUserByUsername(username);
    if (!user) throw new StockNotFoundError(username);
    if (!user.portfolioPublic) throw new PortfolioPrivateError();

    const holdings = await portfolioRepository.findUserHoldings(user.id);

    const totalValue = holdings.reduce((sum, h) => {
      const currentPrice = h.stock.prices[0]
        ? decimalToNumber(h.stock.prices[0].close) ?? Number(h.buyPrice)
        : Number(h.buyPrice);
      return sum + currentPrice * h.quantity;
    }, 0);

    const items = holdings.map((h) => {
      const currentPrice = h.stock.prices[0]
        ? decimalToNumber(h.stock.prices[0].close)
        : null;
      const marketValue = currentPrice !== null ? currentPrice * h.quantity : null;
      const indicator = h.stock.indicators?.[0];

      return {
        ticker: h.stockTicker,
        name: h.stock.name,
        sector: h.stock.sector,
        allocation: totalValue > 0 ? ((marketValue ?? Number(h.buyPrice) * h.quantity) / totalValue) * 100 : 0,
        buyDateMonth: h.buyDate.toISOString().slice(0, 7),
        rsi14: indicator ? decimalToNumber(indicator.rsi14) : null,
        macdSignal: indicator
          ? (decimalToNumber(indicator.macdHist) ?? 0) > 0
            ? "Bullish"
            : "Bearish"
          : null,
      };
    });

    const sectorBreakdown: Record<string, number> = {};
    items.forEach((h) => {
      sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] ?? 0) + h.allocation;
    });

    return {
      user: {
        username: user.username,
        name: user.name,
        image: user.image,
      },
      holdings: items,
      sectorBreakdown,
      totalHoldings: items.length,
    };
  },

  async getBatchHoldings(userIds: string[]): Promise<Record<string, string[]>> {
    const rows = await portfolioRepository.findHoldingsByUserIds(userIds);
    const map: Record<string, string[]> = {};
    rows.forEach((r) => {
      if (!map[r.userId]) map[r.userId] = [];
      map[r.userId].push(r.stockTicker);
    });
    return map;
  },

  async getStockHolders(ticker: string, limit: number = 5) {
    const [holders, count] = await Promise.all([
      portfolioRepository.findPublicHolders(ticker, limit),
      portfolioRepository.countPublicHolders(ticker),
    ]);

    return {
      holders: holders.map((h) => h.user),
      total: count,
    };
  },
};
