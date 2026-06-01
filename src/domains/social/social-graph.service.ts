import { authService } from "@/domains/auth/auth.service";
import { socialGraphRepository } from "./social-graph.repository";
import { eventBus } from "@/lib/event-bus";
import { SelfFollowError, InvalidTargetError } from "./social.errors";

export const socialGraphService = {
  async toggleFollow(currentUserId: string, targetUserId: string): Promise<{ following: boolean }> {
    if (!targetUserId) throw new InvalidTargetError();
    if (targetUserId === currentUserId) throw new SelfFollowError();

    const target = await authService.getProfile(targetUserId);
    if (!target) throw new InvalidTargetError();

    const existing = await socialGraphRepository.findFollow(currentUserId, targetUserId);

    if (existing) {
      await socialGraphRepository.deleteFollow(existing.id);
      eventBus.emit("social:user-unfollowed", {
        followerId: currentUserId,
        followingId: targetUserId,
      });
      return { following: false };
    }

    await socialGraphRepository.createFollow(currentUserId, targetUserId);
    eventBus.emit("social:user-followed", {
      followerId: currentUserId,
      followingId: targetUserId,
    });

    return { following: true };
  },

  async getFollowStatus(currentUserId: string | undefined, targetUserId: string): Promise<boolean> {
    if (!currentUserId) return false;
    return socialGraphRepository.getFollowStatus(currentUserId, targetUserId);
  },

  async toggleStockFollow(userId: string, ticker: string): Promise<{ following: boolean }> {
    if (!ticker) throw new InvalidTargetError();

    const existing = await socialGraphRepository.findStockFollow(userId, ticker);

    if (existing) {
      await socialGraphRepository.deleteStockFollow(existing.id);
      return { following: false };
    }

    await socialGraphRepository.createStockFollow(userId, ticker);
    return { following: true };
  },

  async getStockFollowStatus(userId: string | undefined, ticker: string): Promise<boolean> {
    if (!userId) return false;
    return socialGraphRepository.getStockFollowStatus(userId, ticker);
  },

  getFollowingIds(userId: string): Promise<string[]> {
    return socialGraphRepository.getFollowingIds(userId);
  },

  getFollowedTickers(userId: string): Promise<string[]> {
    return socialGraphRepository.getFollowedTickers(userId);
  },

  getStockFollowers(ticker: string, excludeUserId?: string): Promise<string[]> {
    return socialGraphRepository.getStockFollowers(ticker, excludeUserId);
  },

  async buildFollowingFilter(userId: string): Promise<{ OR: { authorId?: { in: string[] }; tickerTag?: { in: string[] } }[] } | undefined> {
    const [userIds, tickers] = await Promise.all([
      socialGraphRepository.getFollowingIds(userId),
      socialGraphRepository.getFollowedTickers(userId),
    ]);
    if (userIds.length === 0 && tickers.length === 0) return undefined;
    return {
      OR: [
        ...(userIds.length > 0 ? [{ authorId: { in: userIds } }] : []),
        ...(tickers.length > 0 ? [{ tickerTag: { in: tickers } }] : []),
      ],
    };
  },

  async toggleBlock(currentUserId: string, targetUserId: string): Promise<{ blocked: boolean }> {
    if (!targetUserId) throw new InvalidTargetError();
    if (targetUserId === currentUserId) throw new InvalidTargetError();

    const existing = await socialGraphRepository.findBlock(currentUserId, targetUserId);
    if (existing) {
      await socialGraphRepository.deleteBlock(existing.id);
      return { blocked: false };
    }

    await socialGraphRepository.createBlock(currentUserId, targetUserId);
    return { blocked: true };
  },

  async getBlockedUserIds(userId: string): Promise<string[]> {
    return socialGraphRepository.getBlockedUserIds(userId);
  },
};
