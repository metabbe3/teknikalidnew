import { prisma } from "@/lib/prisma";

export const socialGraphRepository = {
  findFollow(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },

  async getFollowingIds(followerId: string): Promise<string[]> {
    const follows = await prisma.follow.findMany({
      where: { followerId },
      select: { followingId: true },
    });
    return follows.map((f) => f.followingId);
  },

  async getFollowStatus(followerId: string, followingId: string): Promise<boolean> {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!existing;
  },

  deleteFollow(id: string) {
    return prisma.follow.delete({ where: { id } });
  },

  createFollow(followerId: string, followingId: string) {
    return prisma.follow.create({ data: { followerId, followingId } });
  },

  findStockFollow(userId: string, ticker: string) {
    return prisma.stockFollow.findUnique({
      where: { userId_ticker: { userId, ticker } },
    });
  },

  async getFollowedTickers(userId: string): Promise<string[]> {
    const stockFollows = await prisma.stockFollow.findMany({
      where: { userId },
      select: { ticker: true },
    });
    return stockFollows.map((s) => s.ticker);
  },

  async getStockFollowStatus(userId: string, ticker: string): Promise<boolean> {
    const existing = await prisma.stockFollow.findUnique({
      where: { userId_ticker: { userId, ticker } },
    });
    return !!existing;
  },

  async getStockFollowers(ticker: string, excludeUserId?: string): Promise<string[]> {
    const followers = await prisma.stockFollow.findMany({
      where: { ticker, ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
      select: { userId: true },
    });
    return followers.map((f) => f.userId);
  },

  createStockFollow(userId: string, ticker: string) {
    return prisma.stockFollow.create({ data: { userId, ticker } });
  },

  deleteStockFollow(id: string) {
    return prisma.stockFollow.delete({ where: { id } });
  },

  findBlock(blockerId: string, blockedId: string) {
    return prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
  },

  createBlock(blockerId: string, blockedId: string) {
    return prisma.block.create({ data: { blockerId, blockedId } });
  },

  deleteBlock(id: string) {
    return prisma.block.delete({ where: { id } });
  },

  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const blocks = await prisma.block.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return blocks.map((b) => b.blockedId);
  },
};
