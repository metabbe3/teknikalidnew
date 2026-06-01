import { reputationRepository } from "./reputation.repository";
import { getBadge } from "./badge";
import { ACHIEVEMENTS, type AchievementType } from "./achievements";
import { UserNotFoundError, DailyAlreadyClaimedError } from "./reputation.errors";
import { eventBus } from "@/lib/event-bus";

export { BADGE_TIERS, getBadge } from "./badge";
export { ACHIEVEMENTS } from "./achievements";
export type { AchievementType };

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export const reputationService = {
  async getUserReputation(userId: string) {
    const user = await reputationRepository.findUserReputation(userId);
    if (!user) throw new UserNotFoundError();
    return { reputation: user.reputation, badge: getBadge(user.reputation) };
  },

  async getWeeklyLeaderboard() {
    const users = await reputationRepository.findWeeklyEngagementUsers();
    return users
      .map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        reputation: user.reputation,
        weeklyScore: user.posts.reduce(
          (sum, post) => sum + post.likesCount + post.commentsCount * 2,
          0
        ),
      }))
      .filter((u) => u.weeklyScore > 0)
      .sort((a, b) => b.weeklyScore - a.weeklyScore)
      .slice(0, 10);
  },

  async claimDailyReward(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cacheKey = `daily-rep:${userId}:${today.toISOString().slice(0, 10)}`;
    const expiresAt = new Date(today.getTime() + 48 * 60 * 60 * 1000);

    try {
      await reputationRepository.claimDailyReward(userId, cacheKey, expiresAt);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) throw new DailyAlreadyClaimedError();
      throw error;
    }

    const user = await reputationRepository.findUserReputation(userId);
    if (!user) return { awarded: true, streak: 1 };

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = 1;
    if (user.lastDailyClaimAt) {
      const lastDate = new Date(user.lastDailyClaimAt);
      lastDate.setHours(0, 0, 0, 0);
      if (lastDate.getTime() === yesterday.getTime()) {
        newStreak = (user.dailyStreak ?? 0) + 1;
      }
    }

    await reputationRepository.updateStreak(userId, newStreak);
    return { awarded: true, streak: newStreak };
  },

  subscribeToEvents() {
    eventBus.on("community:comment-created", async (payload) => {
      if (payload.postAuthorId && payload.postAuthorId !== payload.authorId) {
        try {
          await reputationRepository.awardPoints(payload.postAuthorId, 2);
        } catch (e) {
          console.error("Failed to award comment reputation:", e);
        }
      }
    });

    eventBus.on("community:post-liked", async (payload) => {
      if (payload.userId !== payload.authorId) {
        try {
          await reputationRepository.awardPoints(payload.authorId, 1);
        } catch (e) {
          console.error("Failed to award like reputation:", e);
        }
      }
    });

    eventBus.on("community:post-unliked", async (payload) => {
      try {
        await reputationRepository.awardPoints(payload.authorId, -1);
      } catch (e) {
        console.error("Failed to deduct unlike reputation:", e);
      }
    });

    eventBus.on("social:user-followed", async (payload) => {
      try {
        await reputationRepository.awardPoints(payload.followingId, 3);
      } catch (e) {
        console.error("Failed to award follow reputation:", e);
      }
    });

    eventBus.on("social:user-unfollowed", async (payload) => {
      try {
        await reputationRepository.awardPoints(payload.followingId, -3);
      } catch (e) {
        console.error("Failed to deduct unfollow reputation:", e);
      }
    });

    eventBus.on("community:post-created", async (payload) => {
      try {
        await reputationRepository.awardPoints(payload.authorId, 2);
      } catch (e) {
        console.error("Failed to award post creation reputation:", e);
      }
    });

    eventBus.on("community:post-reposted", async (payload) => {
      if (payload.userId !== payload.authorId) {
        try {
          await reputationRepository.awardPoints(payload.authorId, 1);
        } catch (e) {
          console.error("Failed to award repost reputation:", e);
        }
      }
    });

    eventBus.on("community:post-unreposted", async (payload) => {
      try {
        await reputationRepository.awardPoints(payload.authorId, -1);
      } catch (e) {
        console.error("Failed to deduct unrepost reputation:", e);
      }
    });

    // Achievement checks after events
    eventBus.on("community:post-created", async (payload) => {
      try {
        await reputationService.checkAchievements(payload.authorId);
      } catch (e) {
        console.error("Failed to check achievements:", e);
      }
    });

    eventBus.on("social:user-followed", async (payload) => {
      try {
        await reputationService.checkAchievements(payload.followingId);
      } catch (e) {
        console.error("Failed to check achievements:", e);
      }
    });
  },

  async checkAchievements(userId: string): Promise<string[]> {
    const stats = await reputationRepository.getUserStats(userId);
    if (!stats) return [];

    const postCount = stats._count.posts;
    const followerCount = stats._count.followers;
    const holdingCount = stats._count.portfolioHoldings;
    const predictionCount = await reputationRepository.countPostsWithPrediction(userId);

    const fullUser = await reputationRepository.findUserReputation(userId);
    const streak = fullUser?.dailyStreak ?? 0;

    const checks: [AchievementType, boolean][] = [
      ["first_post", postCount >= 1],
      ["posts_10", postCount >= 10],
      ["posts_50", postCount >= 50],
      ["first_prediction", predictionCount >= 1],
      ["predictions_10", predictionCount >= 10],
      ["followers_10", followerCount >= 10],
      ["followers_100", followerCount >= 100],
      ["portfolio_5", holdingCount >= 5],
      ["daily_streak_7", streak >= 7],
    ];

    const newlyUnlocked: string[] = [];
    for (const [type, shouldUnlock] of checks) {
      if (shouldUnlock && ACHIEVEMENTS[type]) {
        try {
          await reputationRepository.unlockAchievement(userId, type);
          newlyUnlocked.push(type);
        } catch {
          // Already unlocked
        }
      }
    }
    return newlyUnlocked;
  },

  async getUserAchievements(userId: string) {
    const achievements = await reputationRepository.getUserAchievements(userId);
    return achievements.map((a) => ({
      type: a.type,
      ...ACHIEVEMENTS[a.type as AchievementType],
      unlockedAt: a.unlockedAt.toISOString(),
    })).filter((a) => a.label);
  },
};

reputationService.subscribeToEvents();
