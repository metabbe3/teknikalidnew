import { prisma } from "@/lib/prisma";
import { BOT_CONFIG } from "./constants";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const communityAgentRepository = {
  // ── Bot user management ──

  findBotUser(): Promise<{ id: string } | null> {
    return prisma.user.findUnique({
      where: { username: BOT_CONFIG.USERNAME },
      select: { id: true },
    });
  },

  async createBotUser(): Promise<{ id: string }> {
    return prisma.user.create({
      data: {
        email: BOT_CONFIG.EMAIL,
        username: BOT_CONFIG.USERNAME,
        name: BOT_CONFIG.NAME,
        bio: BOT_CONFIG.BIO,
        customTitle: BOT_CONFIG.CUSTOM_TITLE,
      },
      select: { id: true },
    });
  },

  // ── Deduplication ──

  /** Check if bot already posted about this ticker today */
  findBotPostToday(botUserId: string, tickerTag: string): Promise<{ id: string } | null> {
    return prisma.post.findFirst({
      where: {
        authorId: botUserId,
        tickerTag,
        createdAt: { gte: startOfToday() },
      },
      select: { id: true },
    });
  },

  /** Check if bot already posted market pulse today */
  findMarketPulseToday(botUserId: string): Promise<{ id: string } | null> {
    return prisma.post.findFirst({
      where: {
        authorId: botUserId,
        tickerTag: null,
        content: { contains: "Market Pulse" },
        createdAt: { gte: startOfToday() },
      },
      select: { id: true },
    });
  },

  // ── Rate limiting ──

  countBotPostsToday(botUserId: string): Promise<number> {
    return prisma.post.count({
      where: {
        authorId: botUserId,
        createdAt: { gte: startOfToday() },
      },
    });
  },

  countBotRepliesToday(botUserId: string): Promise<number> {
    return prisma.comment.count({
      where: {
        authorId: botUserId,
        createdAt: { gte: startOfToday() },
      },
    });
  },

  // ── Reply targets ──

  /** Find recent user posts with ticker tags that the bot hasn't replied to */
  async findRecentPostsForReply(botUserId: string, since: Date, limit: number) {
    const posts = await prisma.post.findMany({
      where: {
        tickerTag: { not: null },
        authorId: { not: botUserId },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3, // over-fetch, then filter by reply status
      select: {
        id: true,
        content: true,
        tickerTag: true,
        authorId: true,
      },
    });

    const result = [];
    for (const post of posts) {
      if (result.length >= limit) break;
      const existingReply = await prisma.comment.findFirst({
        where: { postId: post.id, authorId: botUserId },
        select: { id: true },
      });
      if (!existingReply) {
        result.push(post);
      }
    }
    return result;
  },
};
