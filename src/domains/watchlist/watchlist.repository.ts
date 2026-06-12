import { prisma } from "@/lib/prisma";

export const watchlistRepository = {
  findEntry(userId: string, stockTicker: string) {
    return prisma.watchlist.findUnique({
      where: { userId_stockTicker: { userId, stockTicker } },
    });
  },

  findUserWatchlist(userId: string) {
    return prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        stockTicker: true,
        createdAt: true,
        stock: {
          select: { ticker: true, name: true, sector: true },
        },
      },
    });
  },

  createEntry(userId: string, stockTicker: string) {
    return prisma.watchlist.create({
      data: { userId, stockTicker },
    });
  },

  deleteEntry(userId: string, stockTicker: string) {
    return prisma.watchlist.delete({
      where: { userId_stockTicker: { userId, stockTicker } },
    });
  },

  createManyEntries(userId: string, stockTickers: string[]) {
    return prisma.watchlist.createMany({
      data: stockTickers.map((stockTicker) => ({ userId, stockTicker })),
      skipDuplicates: true,
    });
  },

  findAllWatchlistTickers() {
    return prisma.watchlist
      .findMany({ select: { stockTicker: true }, distinct: ["stockTicker"] })
      .then((rows) => rows.map((r) => r.stockTicker));
  },
};
