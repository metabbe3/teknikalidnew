import { prisma } from "@/lib/prisma";
import type { AchievementType } from "./achievements";

export const reputationRepository = {
  // Cross-domain: reads User for reputation queries
  findUserReputation(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { reputation: true, lastDailyClaimAt: true, dailyStreak: true },
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

  // Achievements
  unlockAchievement(userId: string, type: AchievementType) {
    return prisma.achievement.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type },
      update: {},
    });
  },

  getUserAchievements(userId: string) {
    return prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
  },

  getUserStats(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            posts: true,
            followers: true,
            portfolioHoldings: true,
          },
        },
      },
    });
  },

  countPostsWithPrediction(userId: string) {
    return prisma.post.count({
      where: { authorId: userId, predictionDirection: { not: null } },
    });
  },

  countDailyClaims(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.cachedApiCall.count({
      where: {
        cacheKey: { startsWith: `daily-rep:${userId}:` },
        fetchedAt: { gte: sevenDaysAgo },
      },
    });
  },

  updateStreak(userId: string, streak: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { dailyStreak: streak, lastDailyClaimAt: new Date() },
    });
  },
};
