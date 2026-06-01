import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const portfolioRepository = {
  findHolding(userId: string, stockTicker: string) {
    return prisma.portfolioHolding.findUnique({
      where: { userId_stockTicker: { userId, stockTicker } },
    });
  },

  findUserHoldings(userId: string) {
    return prisma.portfolioHolding.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        stock: {
          select: {
            ticker: true,
            name: true,
            sector: true,
            id: true,
            prices: {
              orderBy: { date: "desc" },
              take: 2,
              select: { close: true, volume: true },
            },
            indicators: {
              where: { interval: "1d" },
              orderBy: { date: "desc" },
              take: 1,
              select: {
                rsi14: true,
                macdHist: true,
                signalLabel: true,
              },
            },
          },
        },
      },
    });
  },

  createHolding(data: {
    userId: string;
    stockTicker: string;
    buyPrice: Prisma.Decimal;
    quantity: number;
    buyDate: Date;
    notes?: string;
  }) {
    return prisma.portfolioHolding.create({ data });
  },

  updateHolding(
    userId: string,
    stockTicker: string,
    data: {
      buyPrice?: Prisma.Decimal;
      quantity?: number;
      buyDate?: Date;
      notes?: string | null;
    },
  ) {
    return prisma.portfolioHolding.update({
      where: { userId_stockTicker: { userId, stockTicker } },
      data,
    });
  },

  deleteHolding(userId: string, stockTicker: string) {
    return prisma.portfolioHolding.delete({
      where: { userId_stockTicker: { userId, stockTicker } },
    });
  },

  setPortfolioVisibility(userId: string, isPublic: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { portfolioPublic: isPublic },
    });
  },

  findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        portfolioPublic: true,
      },
    });
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { portfolioPublic: true },
    });
  },

  findHoldingsByUserIds(userIds: string[]) {
    return prisma.portfolioHolding.findMany({
      where: {
        userId: { in: userIds },
        user: { portfolioPublic: true },
      },
      select: {
        userId: true,
        stockTicker: true,
      },
    });
  },

  findPublicHolders(stockTicker: string, limit: number) {
    return prisma.portfolioHolding.findMany({
      where: {
        stockTicker,
        user: { portfolioPublic: true, bannedAt: null },
      },
      take: limit,
      select: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
    });
  },

  countPublicHolders(stockTicker: string) {
    return prisma.portfolioHolding.count({
      where: {
        stockTicker,
        user: { portfolioPublic: true, bannedAt: null },
      },
    });
  },

  countUserHoldings(userId: string) {
    return prisma.portfolioHolding.count({
      where: { userId },
    });
  },
};
