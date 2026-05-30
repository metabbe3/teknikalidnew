import { prisma } from "@/lib/prisma";

export const reputationRepository = {
  // Cross-domain: reads User for reputation queries
  findUserReputation(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { reputation: true },
    });
  },

  findWeeklyEngagementUsers() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.user.findMany({
      where: { bannedAt: null },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        reputation: true,
        posts: {
          where: { createdAt: { gte: weekAgo } },
          select: { likesCount: true, commentsCount: true },
        },
      },
    });
  },

  awardPoints(userId: string, delta: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { reputation: { increment: delta } },
    });
  },

  claimDailyReward(userId: string, cacheKey: string, expiresAt: Date) {
    return prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { reputation: { increment: 1 } },
      }),
      prisma.cachedApiCall.create({
        data: { cacheKey, data: { awarded: true }, expiresAt },
      }),
    ]);
  },
};
