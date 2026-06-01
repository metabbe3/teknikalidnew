import type { PaperTradeSide, PaperOrderType, PaperMood } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { fetchQuote } from "@/lib/yahoo-finance";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";
import { paperTradingRepository } from "./paper-trading.repository";
import { VALID_TOPUP_AMOUNTS, getSpreadBps, applySpread } from "@/components/paper-trading/constants";
import {
  AccountNotFoundError,
  InsufficientBalanceError,
  PositionNotFoundError,
  OrderNotFoundError,
  InvalidOrderError,
  AccountAlreadyExistsError,
} from "./paper-trading.errors";

const VALID_BALANCES = [10_000_000, 50_000_000, 100_000_000];

export const paperTradingService = {
  async createAccount(userId: string, initialBalance: number) {
    const existing = await paperTradingRepository.findAccountByUserId(userId);
    if (existing) throw new AccountAlreadyExistsError();

    if (!VALID_BALANCES.includes(initialBalance)) {
      throw new InvalidOrderError("Saldo awal harus 10jt, 50jt, atau 100jt");
    }

    return paperTradingRepository.createAccount(userId, initialBalance);
  },

  async getAccount(userId: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const positions = await paperTradingRepository.findOpenPositions(account.id);
    const balance = decimalToNumber(account.balance)!;
    const initialBalance = decimalToNumber(account.initialBalance)!;

    let positionsValue = 0;
    const positionSummaries = await Promise.all(
      positions.map(async (p) => {
        const entryPrice = decimalToNumber(p.entryPrice)!;
        const marketValue = entryPrice * p.quantity;
        positionsValue += marketValue;
        return { id: p.id, ticker: p.stockTicker, marketValue };
      })
    );

    const totalValue = balance + positionsValue;
    const totalPnl = totalValue - initialBalance;
    const totalPnlPct = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;

    return {
      id: account.id,
      balance,
      initialBalance,
      isPublic: account.isPublic,
      positionCount: positions.length,
      totalValue,
      totalPnl,
      totalPnlPct,
      createdAt: account.createdAt,
    };
  },

  async placeOrder(userId: string, params: {
    stockTicker: string;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP";
    quantity: number;
    targetPrice?: number;
    positionId?: string;
    reason?: string | null;
    strategyTags?: string[] | null;
    mood?: string | null;
  }) {
    if (params.quantity <= 0) throw new InvalidOrderError("Jumlah lot harus lebih dari 0");
    const shares = params.quantity * 100;

    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    if (params.orderType === "MARKET") {
      return this.executeMarketOrder(account, {
        ...params,
        quantity: shares,
        reason: params.reason,
        strategyTags: params.strategyTags,
        mood: params.mood,
      });
    }

    if (!params.targetPrice || params.targetPrice <= 0) {
      throw new InvalidOrderError("Harga target harus diisi untuk order Limit/Stop");
    }

    if (params.side === "BUY") {
      const balance = decimalToNumber(account.balance)!;
      const cost = params.targetPrice * shares;
      if (cost > balance) throw new InsufficientBalanceError(cost, balance);

      await paperTradingRepository.updateAccountBalance(account.id, balance - cost);
    }

    if (params.side === "SELL" && params.orderType === "STOP") {
      if (!params.positionId) throw new InvalidOrderError("Order STOP SELL memerlukan positionId");
      const position = await paperTradingRepository.findPositionById(params.positionId);
      if (!position || position.accountId !== account.id || position.status !== "OPEN") {
        throw new PositionNotFoundError();
      }
    }

    return paperTradingRepository.createOrder({
      accountId: account.id,
      stockTicker: params.stockTicker,
      side: params.side as PaperTradeSide,
      orderType: params.orderType as PaperOrderType,
      quantity: shares,
      targetPrice: params.targetPrice,
      positionId: params.positionId ?? null,
      reason: params.reason,
      strategyTags: params.strategyTags,
      mood: (params.mood as PaperMood) ?? null,
    });
  },

  async executeMarketOrder(
    account: { id: string; balance: Prisma.Decimal },
    params: {
      stockTicker: string;
      side: "BUY" | "SELL";
      quantity: number;
      positionId?: string;
      reason?: string | null;
      strategyTags?: string[] | null;
      mood?: string | null;
    }
  ) {
    const quote = await fetchQuote(params.stockTicker);
    const midPrice = quote.regularMarketPrice;
    if (!midPrice || midPrice <= 0) throw new InvalidOrderError(`Harga ${params.stockTicker} tidak tersedia`);

    const { spreadBps } = await this.getSpreadInfo(params.stockTicker);
    const price = applySpread(midPrice, spreadBps, params.side as "BUY" | "SELL");

    const balance = decimalToNumber(account.balance)!;

    if (params.side === "BUY") {
      const cost = price * params.quantity;
      if (cost > balance) throw new InsufficientBalanceError(cost, balance);

      const [, position] = await Promise.all([
        paperTradingRepository.updateAccountBalance(account.id, balance - cost),
        paperTradingRepository.createPosition({
          accountId: account.id,
          stockTicker: params.stockTicker,
          side: "BUY" as PaperTradeSide,
          entryPrice: price,
          quantity: params.quantity,
          reason: params.reason,
          strategyTags: params.strategyTags,
          mood: params.mood as PaperMood | null,
        }),
      ]);

      return { type: "position" as const, data: position };
    }

    // SELL
    const openPositions = await paperTradingRepository.findOpenPositionsByAccount(
      account.id,
      params.stockTicker
    );
    const totalShares = openPositions.reduce((sum, p) => sum + p.quantity, 0);
    if (params.quantity > totalShares) {
      throw new InvalidOrderError(`Hanya punya ${Math.floor(totalShares / 100)} lot ${params.stockTicker}`);
    }

    const proceeds = price * params.quantity;
    const entryCost = openPositions.reduce((sum, p) => sum + decimalToNumber(p.entryPrice)! * p.quantity, 0);
    const avgEntryPrice = totalShares > 0 ? entryCost / totalShares : price;
    const realizedPnl = (price - avgEntryPrice) * params.quantity;
    const realizedPnlPct = avgEntryPrice > 0 ? (realizedPnl / (avgEntryPrice * params.quantity)) * 100 : 0;

    await paperTradingRepository.updateAccountBalance(account.id, balance + proceeds);

    let remainingQty = params.quantity;
    for (const pos of openPositions) {
      if (remainingQty <= 0) break;
      if (remainingQty >= pos.quantity) {
        const posEntryPrice = decimalToNumber(pos.entryPrice)!;
        const posPnl = (price - posEntryPrice) * pos.quantity;
        const posPnlPct = posEntryPrice > 0 ? (posPnl / (posEntryPrice * pos.quantity)) * 100 : 0;
        await paperTradingRepository.closePosition(pos.id, price, posPnl, posPnlPct);
        remainingQty -= pos.quantity;
      } else {
        // Partial close — close full position, reopen with remaining
        const posEntryPrice = decimalToNumber(pos.entryPrice)!;
        const posPnl = (price - posEntryPrice) * remainingQty;
        const posPnlPct = posEntryPrice > 0 ? (posPnl / (posEntryPrice * remainingQty)) * 100 : 0;
        await paperTradingRepository.closePosition(pos.id, price, posPnl, posPnlPct);

        if (pos.quantity - remainingQty > 0) {
          await paperTradingRepository.createPosition({
            accountId: account.id,
            stockTicker: params.stockTicker,
            side: "BUY" as PaperTradeSide,
            entryPrice: posEntryPrice,
            quantity: pos.quantity - remainingQty,
            reason: pos.reason,
            strategyTags: pos.strategyTags as string[] | null,
            mood: pos.mood as PaperMood | null,
          });
        }
        remainingQty = 0;
      }
    }

    return { type: "closed" as const, data: { realizedPnl, realizedPnlPct } };
  },

  async cancelOrder(userId: string, orderId: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const order = await paperTradingRepository.findOrderById(orderId);
    if (!order) throw new OrderNotFoundError();
    if (order.accountId !== account.id) throw new OrderNotFoundError();
    if (order.status !== "PENDING") throw new InvalidOrderError("Hanya order pending yang bisa dibatalkan");

    // Refund locked balance for BUY limit/stop orders
    if (order.side === "BUY") {
      const balance = decimalToNumber(account.balance)!;
      const refund = decimalToNumber(order.targetPrice)! * order.quantity;
      await paperTradingRepository.updateAccountBalance(account.id, balance + refund);
    }

    return paperTradingRepository.updateOrderStatus(orderId, "CANCELLED");
  },

  async getOpenPositions(userId: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const positions = await paperTradingRepository.findOpenPositions(account.id);

    const enriched = await Promise.all(
      positions.map(async (p) => {
        const entryPrice = decimalToNumber(p.entryPrice)!;
        let currentPrice = entryPrice;
        let change = 0;
        let changePercent = 0;

        try {
          const quote = await fetchQuote(p.stockTicker);
          if (quote.regularMarketPrice) {
            currentPrice = quote.regularMarketPrice;
            change = currentPrice - entryPrice;
            changePercent = entryPrice > 0 ? (change / entryPrice) * 100 : 0;
          }
        } catch {}

        return {
          id: p.id,
          stockTicker: p.stockTicker,
          stockName: p.stock.name,
          side: p.side,
          entryPrice,
          currentPrice,
          quantity: p.quantity,
          lots: Math.floor(p.quantity / 100),
          marketValue: currentPrice * p.quantity,
          unrealizedPnl: change * p.quantity,
          unrealizedPnlPct: changePercent,
          stopLossPrice: decimalToNumber(p.stopLossPrice),
          takeProfitPrice: decimalToNumber(p.takeProfitPrice),
          reason: p.reason,
          strategyTags: p.strategyTags as string[] | null,
          mood: p.mood,
          openedAt: p.openedAt,
        };
      })
    );

    return enriched;
  },

  async closePosition(userId: string, positionId: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const position = await paperTradingRepository.findPositionById(positionId);
    if (!position || position.accountId !== account.id) throw new PositionNotFoundError();
    if (position.status !== "OPEN") throw new InvalidOrderError("Posisi sudah ditutup");

    const quote = await fetchQuote(position.stockTicker);
    const price = quote.regularMarketPrice;
    if (!price || price <= 0) throw new InvalidOrderError("Harga tidak tersedia");

    return this.executeMarketOrder(account, {
      stockTicker: position.stockTicker,
      side: "SELL",
      quantity: position.quantity,
    });
  },

  async updatePosition(userId: string, positionId: string, data: {
    stopLossPrice?: number | null;
    takeProfitPrice?: number | null;
  }) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const position = await paperTradingRepository.findPositionById(positionId);
    if (!position || position.accountId !== account.id) throw new PositionNotFoundError();
    if (position.status !== "OPEN") throw new InvalidOrderError("Posisi sudah ditutup");

    return paperTradingRepository.updatePosition(positionId, data);
  },

  async getTradeHistory(userId: string, cursor?: string, limit = 20) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const positions = await paperTradingRepository.findClosedPositions(account.id, cursor, limit);
    const hasMore = positions.length > limit;
    const items = hasMore ? positions.slice(0, -1) : positions;

    return {
      data: items.map((p) => ({
        id: p.id,
        stockTicker: p.stockTicker,
        stockName: p.stock.name,
        side: p.side,
        entryPrice: decimalToNumber(p.entryPrice),
        closePrice: decimalToNumber(p.closePrice),
        quantity: p.quantity,
        lots: Math.floor(p.quantity / 100),
        realizedPnl: decimalToNumber(p.realizedPnl),
        realizedPnlPct: decimalToNumber(p.realizedPnlPct),
        reason: p.reason,
        strategyTags: p.strategyTags as string[] | null,
        mood: p.mood,
        openedAt: p.openedAt,
        closedAt: p.closedAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },

  async getPendingOrders(userId: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();

    const orders = await paperTradingRepository.findPendingOrders(account.id);
    return orders.map((o) => ({
      id: o.id,
      stockTicker: o.stockTicker,
      stockName: o.stock.name,
      side: o.side,
      orderType: o.orderType,
      quantity: o.quantity,
      lots: Math.floor(o.quantity / 100),
      targetPrice: decimalToNumber(o.targetPrice),
      reason: o.reason,
      strategyTags: o.strategyTags as string[] | null,
      mood: o.mood,
      createdAt: o.createdAt,
    }));
  },

  async togglePublic(userId: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();
    return paperTradingRepository.updateAccountPublic(account.id, !account.isPublic);
  },

  async topUp(userId: string, amount: number) {
    if (!VALID_TOPUP_AMOUNTS.includes(amount)) {
      throw new InvalidOrderError("Jumlah top-up harus 10jt, 50jt, atau 100jt");
    }
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) throw new AccountNotFoundError();
    return paperTradingRepository.addBalance(account.id, amount);
  },

  async getStockPosition(userId: string, ticker: string) {
    const account = await paperTradingRepository.findAccountByUserId(userId);
    if (!account) return null;

    const positions = await paperTradingRepository.findOpenPositionsByAccount(account.id, ticker);
    if (positions.length === 0) return null;

    const quote = await fetchQuote(ticker);
    const midPrice = quote.regularMarketPrice ?? 0;
    if (!midPrice) return null;

    const { spreadBps, avgVolume, isGorengan } = await this.getSpreadInfo(ticker);

    const totalQuantity = positions.reduce((sum, p) => sum + p.quantity, 0);
    const totalEntryCost = positions.reduce(
      (sum, p) => sum + decimalToNumber(p.entryPrice)! * p.quantity, 0
    );
    const avgEntryPrice = totalQuantity > 0 ? totalEntryCost / totalQuantity : midPrice;
    const bidPrice = applySpread(midPrice, spreadBps, "SELL");
    const unrealizedPnl = (bidPrice - avgEntryPrice) * totalQuantity;
    const unrealizedPnlPct = avgEntryPrice > 0 ? (unrealizedPnl / (avgEntryPrice * totalQuantity)) * 100 : 0;
    const spreadCost = midPrice * (spreadBps / 10000) * totalQuantity;

    return {
      stockTicker: ticker,
      quantity: totalQuantity,
      lots: Math.floor(totalQuantity / 100),
      avgEntryPrice,
      currentPrice: midPrice,
      bidPrice,
      askPrice: applySpread(midPrice, spreadBps, "BUY"),
      spreadBps,
      unrealizedPnl,
      unrealizedPnlPct,
      spreadCost,
      positions: positions.map((p) => ({
        id: p.id,
        entryPrice: decimalToNumber(p.entryPrice),
        quantity: p.quantity,
        stopLossPrice: decimalToNumber(p.stopLossPrice),
        takeProfitPrice: decimalToNumber(p.takeProfitPrice),
        reason: p.reason,
        strategyTags: p.strategyTags as string[] | null,
        mood: p.mood,
        openedAt: p.openedAt,
      })),
    };
  },

  async getSpreadInfo(ticker: string) {
    const [fundamental, indicator] = await Promise.all([
      prisma.stockFundamental.findFirst({
        where: { stock: { ticker } },
        orderBy: { date: "desc" },
        select: { averageDailyVolume3Month: true },
      }),
      prisma.stockIndicator.findFirst({
        where: { stock: { ticker }, interval: "daily" },
        orderBy: { date: "desc" },
        select: { isGorengan: true },
      }),
    ]);

    const avgVolume = bigIntToNumber(fundamental?.averageDailyVolume3Month ?? null);
    const isGorengan = indicator?.isGorengan ?? false;
    const spreadBps = getSpreadBps(avgVolume, isGorengan);

    return { spreadBps, avgVolume, isGorengan };
  },

  async checkPendingOrders() {
    const orders = await paperTradingRepository.findPendingOrdersForCheck();

    for (const order of orders) {
      try {
        const quote = await fetchQuote(order.stockTicker);
        const price = quote.regularMarketPrice;
        if (!price) continue;

        const target = decimalToNumber(order.targetPrice)!;
        let shouldFill = false;

        if (order.orderType === "LIMIT") {
          shouldFill = order.side === "BUY" ? price <= target : price >= target;
        } else if (order.orderType === "STOP") {
          shouldFill = order.side === "BUY" ? price >= target : price <= target;
        }

        if (!shouldFill) continue;

        if (order.side === "BUY") {
          const balance = decimalToNumber(order.account.balance)!;
          const cost = price * order.quantity;
          if (cost > balance) continue;

          await paperTradingRepository.updateAccountBalance(order.account.id, balance - cost);

          // Refund any difference between locked amount and actual cost
          const locked = target * order.quantity;
          const refund = locked - cost;
          if (refund > 0) {
            const newBalance = decimalToNumber(
              (await paperTradingRepository.findAccountByUserId(order.account.userId))!.balance
            )!;
            await paperTradingRepository.updateAccountBalance(order.account.id, newBalance + refund);
          }

          await paperTradingRepository.createPosition({
            accountId: order.accountId,
            stockTicker: order.stockTicker,
            side: "BUY" as PaperTradeSide,
            entryPrice: price,
            quantity: order.quantity,
            reason: order.reason,
            strategyTags: order.strategyTags as string[] | null,
            mood: order.mood as PaperMood | null,
          });
        } else {
          // SELL — close position
          const openPositions = await paperTradingRepository.findOpenPositionsByAccount(
            order.accountId,
            order.stockTicker
          );
          if (openPositions.length === 0) continue;

          const balance = decimalToNumber(order.account.balance)!;
          const proceeds = price * order.quantity;
          const entryCost = openPositions.reduce(
            (sum, p) => sum + decimalToNumber(p.entryPrice)! * p.quantity, 0
          );
          const totalShares = openPositions.reduce((sum, p) => sum + p.quantity, 0);
          const avgEntryPrice = totalShares > 0 ? entryCost / totalShares : price;
          const realizedPnl = (price - avgEntryPrice) * order.quantity;
          const realizedPnlPct = avgEntryPrice > 0
            ? (realizedPnl / (avgEntryPrice * order.quantity)) * 100 : 0;

          await paperTradingRepository.updateAccountBalance(order.account.id, balance + proceeds);

          let remaining = order.quantity;
          for (const pos of openPositions) {
            if (remaining <= 0) break;
            const qty = Math.min(remaining, pos.quantity);
            const posEntryPrice = decimalToNumber(pos.entryPrice)!;
            const posPnl = (price - posEntryPrice) * qty;
            const posPnlPct = posEntryPrice > 0 ? (posPnl / (posEntryPrice * qty)) * 100 : 0;

            if (qty >= pos.quantity) {
              await paperTradingRepository.closePosition(pos.id, price, posPnl, posPnlPct);
            } else {
              await paperTradingRepository.closePosition(pos.id, price, posPnl, posPnlPct);
              await paperTradingRepository.createPosition({
                accountId: order.accountId,
                stockTicker: pos.stockTicker,
                side: "BUY" as PaperTradeSide,
                entryPrice: posEntryPrice,
                quantity: pos.quantity - qty,
              });
            }
            remaining -= qty;
          }
        }

        await paperTradingRepository.updateOrderStatus(order.id, "FILLED", price);
      } catch (err) {
        console.error(`[PaperTrading] Error checking order ${order.id}:`, err);
      }
    }
  },

  async checkStopLossTakeProfit() {
    const positions = await paperTradingRepository.findOpenPositionsForCheck();

    for (const pos of positions) {
      try {
        const quote = await fetchQuote(pos.stockTicker);
        const price = quote.regularMarketPrice;
        if (!price) continue;

        const sl = decimalToNumber(pos.stopLossPrice);
        const tp = decimalToNumber(pos.takeProfitPrice);

        let triggered = false;
        if (sl && price <= sl) triggered = true;
        if (tp && price >= tp) triggered = true;

        if (!triggered) continue;

        const entryPrice = decimalToNumber(pos.entryPrice)!;
        const realizedPnl = (price - entryPrice) * pos.quantity;
        const realizedPnlPct = entryPrice > 0
          ? (realizedPnl / (entryPrice * pos.quantity)) * 100 : 0;

        const balance = decimalToNumber(pos.account.balance)!;
        const proceeds = price * pos.quantity;

        await paperTradingRepository.updateAccountBalance(pos.account.id, balance + proceeds);
        await paperTradingRepository.closePosition(pos.id, price, realizedPnl, realizedPnlPct);
      } catch (err) {
        console.error(`[PaperTrading] Error checking SL/TP for position ${pos.id}:`, err);
      }
    }
  },
};
