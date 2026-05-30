import { reputationRepository } from "./reputation.repository";
import { getBadge } from "./badge";
import { UserNotFoundError, DailyAlreadyClaimedError } from "./reputation.errors";
import { eventBus } from "@/lib/event-bus";

export { BADGE_TIERS, getBadge } from "./badge";

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
      return { awarded: true };
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) throw new DailyAlreadyClaimedError();
      throw error;
    }
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
  },
};

reputationService.subscribeToEvents();
