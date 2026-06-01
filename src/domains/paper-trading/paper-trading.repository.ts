import { Prisma } from "@/generated/prisma/client";
import type {
  PaperTradeSide,
  PaperMood,
  PaperOrderType,
  PaperOrderStatus,
  PaperPositionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const paperTradingRepository = {
  createAccount(userId: string, balance: number) {
    return prisma.paperAccount.create({
      data: {
        userId,
        balance: new Prisma.Decimal(balance),
        initialBalance: new Prisma.Decimal(balance),
      },
    });
  },

  findAccountByUserId(userId: string) {
    return prisma.paperAccount.findUnique({
      where: { userId },
    });
  },

  updateAccountBalance(id: string, balance: number) {
    return prisma.paperAccount.update({
      where: { id },
      data: { balance: new Prisma.Decimal(balance) },
    });
  },

  addBalance(id: string, amount: number) {
    return prisma.paperAccount.update({
      where: { id },
      data: {
        balance: { increment: new Prisma.Decimal(amount) },
        initialBalance: { increment: new Prisma.Decimal(amount) },
      },
    });
  },

  updateAccountPublic(id: string, isPublic: boolean) {
    return prisma.paperAccount.update({
      where: { id },
      data: { isPublic },
    });
  },

  createPosition(data: {
    accountId: string;
    stockTicker: string;
    side: PaperTradeSide;
    entryPrice: number;
    quantity: number;
    reason?: string | null;
    strategyTags?: string[] | null;
    mood?: PaperMood | null;
  }) {
    return prisma.paperPosition.create({
      data: {
        accountId: data.accountId,
        stockTicker: data.stockTicker,
        side: data.side,
        entryPrice: new Prisma.Decimal(data.entryPrice),
        quantity: data.quantity,
        reason: data.reason,
        strategyTags: data.strategyTags ?? undefined,
        mood: data.mood ?? undefined,
      },
      include: { stock: { select: { ticker: true, name: true } } },
    });
  },

  findOpenPositions(accountId: string) {
    return prisma.paperPosition.findMany({
      where: { accountId, status: "OPEN" as PaperPositionStatus },
      orderBy: { openedAt: "desc" },
      include: { stock: { select: { ticker: true, name: true } } },
    });
  },

  findPositionById(id: string) {
    return prisma.paperPosition.findUnique({
      where: { id },
      include: { stock: { select: { ticker: true, name: true } } },
    });
  },

  updatePosition(id: string, data: {
    stopLossPrice?: number | null;
    takeProfitPrice?: number | null;
  }) {
    const update: Prisma.PaperPositionUpdateInput = {};
    if (data.stopLossPrice !== undefined) {
      update.stopLossPrice = data.stopLossPrice ? new Prisma.Decimal(data.stopLossPrice) : null;
    }
    if (data.takeProfitPrice !== undefined) {
      update.takeProfitPrice = data.takeProfitPrice ? new Prisma.Decimal(data.takeProfitPrice) : null;
    }
    return prisma.paperPosition.update({ where: { id }, data: update });
  },

  closePosition(id: string, closePrice: number, realizedPnl: number, realizedPnlPct: number) {
    return prisma.paperPosition.update({
      where: { id },
      data: {
        status: "CLOSED" as PaperPositionStatus,
        closePrice: new Prisma.Decimal(closePrice),
        realizedPnl: new Prisma.Decimal(realizedPnl),
        realizedPnlPct: new Prisma.Decimal(realizedPnlPct),
        closedAt: new Date(),
      },
    });
  },

  findOpenPositionsByAccount(accountId: string, stockTicker: string) {
    return prisma.paperPosition.findMany({
      where: { accountId, stockTicker, status: "OPEN" as PaperPositionStatus, side: "BUY" as PaperTradeSide },
    });
  },

  createOrder(data: {
    accountId: string;
    stockTicker: string;
    side: PaperTradeSide;
    orderType: PaperOrderType;
    quantity: number;
    targetPrice: number;
    positionId?: string | null;
    reason?: string | null;
    strategyTags?: string[] | null;
    mood?: PaperMood | null;
  }) {
    return prisma.paperOrder.create({
      data: {
        accountId: data.accountId,
        stockTicker: data.stockTicker,
        side: data.side,
        orderType: data.orderType,
        quantity: data.quantity,
        targetPrice: new Prisma.Decimal(data.targetPrice),
        positionId: data.positionId,
        reason: data.reason,
        strategyTags: data.strategyTags ?? undefined,
        mood: data.mood ?? undefined,
      },
      include: { stock: { select: { ticker: true, name: true } } },
    });
  },

  findPendingOrders(accountId: string) {
    return prisma.paperOrder.findMany({
      where: { accountId, status: "PENDING" as PaperOrderStatus },
      orderBy: { createdAt: "desc" },
      include: { stock: { select: { ticker: true, name: true } } },
    });
  },

  findOrderById(id: string) {
    return prisma.paperOrder.findUnique({ where: { id } });
  },

  updateOrderStatus(id: string, status: "FILLED" | "CANCELLED", filledPrice?: number) {
    return prisma.paperOrder.update({
      where: { id },
      data: {
        status: status as PaperOrderStatus,
        filledPrice: filledPrice ? new Prisma.Decimal(filledPrice) : undefined,
        filledAt: status === "FILLED" ? new Date() : undefined,
      },
    });
  },

  findClosedPositions(accountId: string, cursor?: string, limit = 20) {
    return prisma.paperPosition.findMany({
      where: {
        accountId,
        status: "CLOSED" as PaperPositionStatus,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      take: limit + 1,
      orderBy: { closedAt: "desc" },
      include: { stock: { select: { ticker: true, name: true } } },
    });
  },

  findPendingOrdersForCheck() {
    return prisma.paperOrder.findMany({
      where: { status: "PENDING" as PaperOrderStatus },
      include: { account: true },
    });
  },

  findOpenPositionsForCheck() {
    return prisma.paperPosition.findMany({
      where: {
        status: "OPEN" as PaperPositionStatus,
        OR: [
          { stopLossPrice: { not: null } },
          { takeProfitPrice: { not: null } },
        ],
      },
      include: { account: true },
    });
  },
};
