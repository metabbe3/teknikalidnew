import { communityRepository, serializeAuthor } from "./community.repository";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { eventBus } from "@/lib/event-bus";
import { stockRepository } from "@/domains/stock/stock.repository";
import { prisma } from "@/lib/prisma";
import { PREDICTION_OUTCOME } from "@/lib/constants";
import { getAvatarUrl } from "@/lib/avatar";
import {
  PostNotFoundError,
  CommentNotFoundError,
  ContentRequiredError,
  ContentTooLongError,
  InvalidTickerError,
  InvalidPredictionError,
  InvalidPredictionTargetError,
  NotAuthorizedError,
} from "./community.errors";

const VALID_PREDICTIONS = ["bullish", "bearish", "neutral"];

function extractMentionedUsernames(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_]{3,20})/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]{2,30})/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export const communityService = {
  async getFeed(params: {
    userId?: string;
    cursor?: string;
    limit: number;
    sort?: "trending";
    filter?: "following";
  }) {
    let followingFilter;
    if (params.filter === "following" && params.userId) {
      followingFilter = await socialGraphService.buildFollowingFilter(
        params.userId
      );
    }

    const posts = await communityRepository.findPostsFeed({
      ...params,
      followingFilter,
    });

    const hasMore = posts.length > params.limit;
    const items = hasMore ? posts.slice(0, -1) : posts;

    // Fetch repost state for authenticated user
    let repostedPostIds: Set<string> = new Set();
    if (params.userId && items.length > 0) {
      const reposts = await communityRepository.findRepostsByUser(
        params.userId,
        items.map((p) => p.id)
      );
      repostedPostIds = new Set(reposts.map((r) => r.postId));
    }

    // Fetch user's poll votes
    const pollIds = items
      .filter((p) => "poll" in p && p.poll)
      .map((p) => (p as { poll: { id: string } }).poll.id);
    const userVotes = params.userId && pollIds.length > 0
      ? await communityRepository.findVotesByUser(params.userId, pollIds)
      : [];
    const voteMap = new Map(userVotes.map((v) => [v.pollId, v.optionId]));

    return {
      data: items.map((post) => {
        const pollData = "poll" in post ? post.poll as { id: string; options: { id: string; text: string; votesCount: number }[] } | null : null;
        return {
          id: post.id,
          content: post.content,
          tickerTag: post.tickerTag,
          predictionDirection: post.predictionDirection ?? null,
          predictionTarget: post.predictionTarget
            ? String(post.predictionTarget)
            : null,
          predictionOutcome: post.predictionOutcome ?? null,
          imageUrl: post.imageUrl ?? null,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          repostsCount: post.repostsCount,
          createdAt: post.createdAt.toISOString(),
          author: serializeAuthor(post.author),
          likedByMe: params.userId
            ? "likes" in post && Array.isArray(post.likes) && post.likes.length > 0
            : false,
          repostedByMe: repostedPostIds.has(post.id),
          repostedBy: null as { username: string; name: string | null } | null,
          poll: pollData
            ? {
                id: pollData.id,
                options: pollData.options.map((o) => ({ id: o.id, text: o.text, votesCount: o.votesCount })),
                myVote: voteMap.get(pollData.id) ?? null,
              }
            : null,
        };
      }),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },

  async searchPosts(params: {
    userId?: string;
    query: string;
    ticker?: string;
    cursor?: string;
    limit: number;
  }) {
    const posts = await communityRepository.searchPosts(params);
    const hasMore = posts.length > params.limit;
    const items = hasMore ? posts.slice(0, -1) : posts;

    // Fetch user's poll votes
    const pollIds = items
      .filter((p) => "poll" in p && p.poll)
      .map((p) => (p as { poll: { id: string } }).poll.id);
    const userVotes = params.userId && pollIds.length > 0
      ? await communityRepository.findVotesByUser(params.userId, pollIds)
      : [];
    const voteMap = new Map(userVotes.map((v) => [v.pollId, v.optionId]));

    return {
      data: items.map((post) => {
        const pollData = "poll" in post ? post.poll as { id: string; options: { id: string; text: string; votesCount: number }[] } | null : null;
        return {
          id: post.id,
          content: post.content,
          tickerTag: post.tickerTag,
          predictionDirection: post.predictionDirection ?? null,
          predictionTarget: post.predictionTarget
            ? String(post.predictionTarget)
            : null,
          predictionOutcome: post.predictionOutcome ?? null,
          imageUrl: post.imageUrl ?? null,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          repostsCount: post.repostsCount,
          createdAt: post.createdAt.toISOString(),
          author: serializeAuthor(post.author),
          likedByMe: params.userId
            ? "likes" in post && Array.isArray(post.likes) && post.likes.length > 0
            : false,
          repostedByMe: false,
          repostedBy: null as { username: string; name: string | null } | null,
          poll: pollData
            ? {
                id: pollData.id,
                options: pollData.options.map((o) => ({ id: o.id, text: o.text, votesCount: o.votesCount })),
                myVote: voteMap.get(pollData.id) ?? null,
              }
            : null,
        };
      }),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },

  async createPost(
    userId: string,
    data: {
      content: string;
      tickerTag?: string;
      predictionDirection?: string;
      predictionTarget?: number;
      imageUrl?: string;
    }
  ) {
    if (!data.content || typeof data.content !== "string") {
      throw new ContentRequiredError();
    }
    if (data.content.length > 1000) {
      throw new ContentTooLongError(1000);
    }
    if (data.tickerTag && !(await stockRepository.findStockByTicker(data.tickerTag))) {
      throw new InvalidTickerError();
    }
    if (
      data.predictionDirection &&
      !VALID_PREDICTIONS.includes(data.predictionDirection)
    ) {
      throw new InvalidPredictionError();
    }
    if (
      data.predictionTarget !== undefined &&
      data.predictionTarget !== null &&
      (typeof data.predictionTarget !== "number" || data.predictionTarget <= 0)
    ) {
      throw new InvalidPredictionTargetError();
    }

    const tags = extractHashtags(data.content);

    const post = await communityRepository.createPost({
      content: data.content,
      authorId: userId,
      tickerTag: data.tickerTag || null,
      predictionDirection: data.predictionDirection || null,
      predictionTarget: data.predictionTarget || null,
      imageUrl: data.imageUrl || null,
      tags,
    });

    eventBus.emit("community:post-created", {
      postId: post.id,
      authorId: userId,
      tickerTag: data.tickerTag || null,
    });

    return post;
  },

  async getTrendingTags(days = 7, limit = 10) {
    const result = await communityRepository.getTrendingTags(days, limit);
    return result.map((r) => ({ tag: r.tag, count: r._count.tag }));
  },

  async getFeedByTag(params: {
    tag: string;
    userId?: string;
    cursor?: string;
    limit: number;
  }) {
    const posts = await communityRepository.findPostsByTag(params);
    const hasMore = posts.length > params.limit;
    const items = hasMore ? posts.slice(0, -1) : posts;

    return {
      data: items.map((post) => ({
        id: post.id,
        content: post.content,
        tickerTag: post.tickerTag,
        predictionDirection: post.predictionDirection ?? null,
        predictionTarget: post.predictionTarget ? String(post.predictionTarget) : null,
        predictionOutcome: post.predictionOutcome ?? null,
        imageUrl: post.imageUrl ?? null,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        repostsCount: post.repostsCount,
        createdAt: post.createdAt.toISOString(),
        author: serializeAuthor(post.author),
        likedByMe: params.userId
          ? "likes" in post && Array.isArray(post.likes) && post.likes.length > 0
          : false,
        repostedByMe: false,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  },

  async getPost(postId: string, userId?: string) {
    const post = await communityRepository.findPostById(postId, userId);
    if (!post) throw new PostNotFoundError();

    const hasMoreComments = post.comments.length > 20;
    const comments = hasMoreComments
      ? post.comments.slice(0, -1)
      : post.comments;

    return {
      id: post.id,
      content: post.content,
      tickerTag: post.tickerTag,
      predictionDirection: post.predictionDirection,
      predictionTarget: post.predictionTarget,
      predictionOutcome: post.predictionOutcome ?? null,
      imageUrl: post.imageUrl ?? null,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      repostsCount: post.repostsCount,
      createdAt: post.createdAt,
      author: serializeAuthor(post.author),
      likedByMe: userId
        ? Array.isArray(post.likes) && post.likes.length > 0
        : false,
      repostedByMe: false,
      comments,
      nextCommentCursor: hasMoreComments
        ? comments[comments.length - 1].id
        : null,
    };
  },

  async toggleLike(userId: string, postId: string) {
    const [authorResult, existing] = await Promise.all([
      communityRepository.findPostAuthorId(postId),
      communityRepository.findLike(userId, postId),
    ]);

    if (!authorResult) throw new PostNotFoundError();

    if (existing) {
      await communityRepository.deleteLike(userId, postId);
      eventBus.emit("community:post-unliked", {
        postId,
        userId,
        authorId: authorResult.authorId,
      });
      return { liked: false };
    }

    await communityRepository.createLike(userId, postId);
    eventBus.emit("community:post-liked", {
      postId,
      userId,
      authorId: authorResult.authorId,
    });

    return { liked: true };
  },

  async createPostComment(
    userId: string,
    data: { content: string; postId: string; parentId?: string }
  ) {
    if (!data.content || typeof data.content !== "string") {
      throw new ContentRequiredError();
    }
    if (data.content.length > 500) {
      throw new ContentTooLongError(500);
    }

    const post = await communityRepository.findPostAuthorId(data.postId);
    if (!post) throw new PostNotFoundError();

    if (data.parentId) {
      const parent = await communityRepository.findParentComment(
        data.parentId
      );
      if (!parent) throw new CommentNotFoundError();
    }

    const comment = await communityRepository.createComment({
      content: data.content,
      authorId: userId,
      postId: data.postId,
      stockTicker: null,
      parentId: data.parentId || null,
    });

    eventBus.emit("community:comment-created", {
      commentId: comment.id,
      authorId: userId,
      postId: data.postId,
      postAuthorId: post.authorId,
      mentionedUsernames: extractMentionedUsernames(data.content),
    });

    return comment;
  },

  async createStockComment(
    userId: string,
    ticker: string,
    data: { content: string; parentId?: string }
  ) {
    if (!(await stockRepository.findStockByTicker(ticker))) throw new InvalidTickerError();
    if (!data.content || typeof data.content !== "string") {
      throw new ContentRequiredError();
    }
    if (data.content.length > 500) {
      throw new ContentTooLongError(500);
    }

    if (data.parentId) {
      const parent = await communityRepository.findParentComment(
        data.parentId
      );
      if (!parent) throw new CommentNotFoundError();
    }

    const comment = await communityRepository.createComment({
      content: data.content,
      authorId: userId,
      postId: null,
      stockTicker: ticker,
      parentId: data.parentId || null,
    });

    eventBus.emit("community:comment-created", {
      commentId: comment.id,
      authorId: userId,
      postId: null,
      mentionedUsernames: extractMentionedUsernames(data.content),
    });

    return comment;
  },

  async deleteComment(
    user: { id: string; role: string },
    commentId: string
  ) {
    const comment = await communityRepository.findCommentById(commentId);
    if (!comment) throw new CommentNotFoundError();
    if (comment.authorId !== user.id && user.role !== "ADMIN") {
      throw new NotAuthorizedError();
    }

    await communityRepository.deleteComment(
      commentId,
      comment.postId
    );
    return { deleted: true };
  },

  async deletePost(
    user: { id: string; role: string },
    postId: string
  ) {
    const post = await communityRepository.findPostAuthorId(postId);
    if (!post) throw new PostNotFoundError();
    if (post.authorId !== user.id && user.role !== "ADMIN") {
      throw new NotAuthorizedError();
    }

    await communityRepository.deletePost(postId);
    return { deleted: true };
  },

  async updatePost(
    user: { id: string; role: string },
    postId: string,
    content: string
  ) {
    if (!content || typeof content !== "string") {
      throw new ContentRequiredError();
    }
    if (content.length > 1000) {
      throw new ContentTooLongError(1000);
    }

    const post = await communityRepository.findPostAuthorId(postId);
    if (!post) throw new PostNotFoundError();
    if (post.authorId !== user.id && user.role !== "ADMIN") {
      throw new NotAuthorizedError();
    }

    return communityRepository.updatePost(postId, { content });
  },

  async getStockTickerComments(ticker: string, cursor?: string, limit: number = 20) {
    if (!(await stockRepository.findStockByTicker(ticker))) throw new InvalidTickerError();

    const [posts, comments] =
      await communityRepository.findStockTickerComments(ticker);

    type PostItem = (typeof posts)[number] & { type: "post" };
    type CommentItem = (typeof comments)[number] & { type: "comment" };
    const merged: (PostItem | CommentItem)[] = [
      ...posts.map((p) => ({ ...p, type: "post" as const })),
      ...comments.map((c) => ({ ...c, type: "comment" as const })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let startIndex = 0;
    if (cursor) {
      const cursorItem = merged.find((item) => item.id === cursor);
      if (cursorItem) {
        startIndex = merged.indexOf(cursorItem) + 1;
      }
    }

    const sliced = merged.slice(startIndex);
    const hasMore = sliced.length > limit;
    const items = sliced.slice(0, limit);

    return {
      data: items,
      nextCursor:
        hasMore && items.length > 0 ? items[items.length - 1].id : null,
    };
  },

  async toggleBookmark(userId: string, postId: string) {
    const existing = await communityRepository.findBookmark(userId, postId);
    if (existing) {
      await communityRepository.deleteBookmark(existing.id);
      return { bookmarked: false };
    }
    await communityRepository.createBookmark(userId, postId);
    return { bookmarked: true };
  },

  async getUserBookmarks(userId: string) {
    const bookmarks = await communityRepository.findUserBookmarks(userId);
    return {
      data: bookmarks.map((b) => ({
        id: b.post.id,
        content: b.post.content,
        tickerTag: b.post.tickerTag,
        likesCount: b.post.likesCount,
        commentsCount: b.post.commentsCount,
        createdAt: b.post.createdAt.toISOString(),
        author: serializeAuthor(b.post.author),
        bookmarkedAt: b.createdAt.toISOString(),
      })),
    };
  },

  async resolvePredictions(minAgeDays = 7) {
    const unresolved = await communityRepository.findUnresolvedPredictions(minAgeDays);
    let resolved = 0;

    for (const post of unresolved) {
      const ticker = post.tickerTag!;

      // Find the stock and its ID
      const stock = await stockRepository.findStockByTicker(ticker);
      if (!stock) continue;

      // Get price on prediction date (nearest trading day on or after)
      const priceOnDate = await prisma.stockPrice.findFirst({
        where: { stockId: stock.id, date: { gte: post.createdAt } },
        orderBy: { date: "asc" },
      });
      if (!priceOnDate) continue;

      // Get latest price
      const latestPrice = await prisma.stockPrice.findFirst({
        where: { stockId: stock.id },
        orderBy: { date: "desc" },
      });
      if (!latestPrice) continue;

      const entryPrice = Number(priceOnDate.close);
      const exitPrice = Number(latestPrice.close);
      const direction = post.predictionDirection!;
      const target = post.predictionTarget ? Number(post.predictionTarget) : null;

      let outcome: "correct" | "incorrect";

      if (target && target > 0) {
        // Target-based: correct if price crossed the target
        if (direction === "bullish") {
          outcome = exitPrice >= target ? "correct" : "incorrect";
        } else if (direction === "bearish") {
          outcome = exitPrice <= target ? "correct" : "incorrect";
        } else {
          outcome = "incorrect";
        }
      } else {
        // Direction-based: correct if price moved in predicted direction
        const priceChange = exitPrice - entryPrice;
        if (direction === "bullish") {
          outcome = priceChange > 0 ? "correct" : "incorrect";
        } else if (direction === "bearish") {
          outcome = priceChange < 0 ? "correct" : "incorrect";
        } else {
          outcome = "incorrect";
        }
      }

      await communityRepository.updatePredictionOutcome(post.id, outcome);
      resolved++;
    }

    return { resolved, total: unresolved.length };
  },

  async getUserPredictionStats(userId: string) {
    const groups = await communityRepository.getUserPredictionStats(userId);
    let correct = 0;
    let incorrect = 0;
    for (const g of groups) {
      if (g.predictionOutcome === "correct") correct = g._count.predictionOutcome;
      else if (g.predictionOutcome === "incorrect") incorrect = g._count.predictionOutcome;
    }
    const total = correct + incorrect;
    return { correct, incorrect, total, accuracy: total > 0 ? Math.round((correct / total) * 100) : null };
  },

  async toggleRepost(userId: string, postId: string) {
    const authorResult = await communityRepository.findPostAuthorId(postId);
    if (!authorResult) throw new PostNotFoundError();

    const existing = await communityRepository.findRepost(userId, postId);
    if (existing) {
      await communityRepository.deleteRepost(userId, postId);
      return { reposted: false };
    }

    await communityRepository.createRepost(userId, postId);
    eventBus.emit("community:post-reposted", {
      postId,
      userId,
      authorId: authorResult.authorId,
    });
    return { reposted: true };
  },

  async getTopContributors(limit = 10) {
    const groups = await communityRepository.getTopContributors(limit);

    if (groups.length === 0) return [];

    const userIds = groups.map((g) => g.authorId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return groups.map((g) => {
      const user = userMap.get(g.authorId);
      const likes = g._sum.likesCount ?? 0;
      const comments = g._sum.commentsCount ?? 0;
      return {
        id: g.authorId,
        username: user?.username ?? "unknown",
        name: user?.name ?? null,
        image: user?.image ?? null,
        engagementScore: likes + comments,
      };
    });
  },

  async getTrendingTagsWithTrend(days = 7, priorDays = 7, limit = 8) {
    const [current, prior] = await communityRepository.getTrendingTagsWithTrend(days, priorDays, limit);

    const priorMap = new Map(prior.map((r) => [r.tag, r._count.tag]));

    return current.map((r) => {
      const currentCount = r._count.tag;
      const priorCount = priorMap.get(r.tag) ?? 0;
      const trendPercent = priorCount > 0
        ? Math.round(((currentCount - priorCount) / priorCount) * 100)
        : currentCount > 0 ? 100 : 0;

      return { tag: r.tag, count: currentCount, trendPercent };
    });
  },

  async toggleReaction(userId: string, postId: string, type: string) {
    const VALID_TYPES = ["LIKE", "BULLISH", "BEARISH", "INSIGHTFUL", "ROCKET", "FIRE"];
    if (!VALID_TYPES.includes(type)) throw new InvalidPredictionError();

    const authorResult = await communityRepository.findPostAuthorId(postId);
    if (!authorResult) throw new PostNotFoundError();

    const existing = await communityRepository.findReaction(userId, postId);
    if (existing) {
      await communityRepository.deleteReaction(userId, postId);
      return { reacted: false, type: existing.type };
    }

    await communityRepository.createReaction(userId, postId, type);
    eventBus.emit("community:post-reacted", {
      postId,
      userId,
      authorId: authorResult.authorId,
      reactionType: type,
    });
    return { reacted: true, type };
  },

  async createPoll(postId: string, options: string[]) {
    if (!options || options.length < 2 || options.length > 4) {
      throw new ContentRequiredError();
    }
    if (options.some((o) => !o.trim())) {
      throw new ContentRequiredError();
    }
    return communityRepository.createPoll(postId, options.map((o) => o.trim()));
  },

  async voteOnPoll(userId: string, pollId: string, optionId: string) {
    const existing = await communityRepository.findUserVote(userId, pollId);

    if (existing) {
      if (existing.optionId === optionId) {
        await Promise.all([
          communityRepository.deleteVote(userId, pollId),
          communityRepository.decrementOptionVotes(optionId),
        ]);
        return { voted: false };
      }
      await Promise.all([
        communityRepository.deleteVote(userId, pollId),
        communityRepository.decrementOptionVotes(existing.optionId),
        communityRepository.createVote(optionId, pollId, userId),
        communityRepository.incrementOptionVotes(optionId),
      ]);
      return { voted: true, changed: true };
    }

    await Promise.all([
      communityRepository.createVote(optionId, pollId, userId),
      communityRepository.incrementOptionVotes(optionId),
    ]);
    return { voted: true };
  },

  async getStockSentiment(ticker: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const bullishReactions = await prisma.reaction.count({
      where: { type: "BULLISH", post: { tickerTag: ticker, createdAt: { gte: thirtyDaysAgo } } },
    });
    const bearishReactions = await prisma.reaction.count({
      where: { type: "BEARISH", post: { tickerTag: ticker, createdAt: { gte: thirtyDaysAgo } } },
    });

    const bullishPredictions = await prisma.post.count({
      where: { tickerTag: ticker, predictionDirection: "bullish", createdAt: { gte: thirtyDaysAgo } },
    });
    const bearishPredictions = await prisma.post.count({
      where: { tickerTag: ticker, predictionDirection: "bearish", createdAt: { gte: thirtyDaysAgo } },
    });

    const bullish = bullishReactions + bullishPredictions;
    const bearish = bearishReactions + bearishPredictions;
    const total = bullish + bearish;

    const sentiment: "bullish" | "bearish" | "neutral" =
      total === 0 ? "neutral" : bullish > bearish * 1.5 ? "bullish" : bearish > bullish * 1.5 ? "bearish" : "neutral";

    return { bullish, bearish, total, sentiment };
  },

  async togglePin(userId: string, postId: string): Promise<{ pinned: boolean }> {
    const post = await communityRepository.findPostAuthorId(postId);
    if (!post) throw new PostNotFoundError();
    if (post.authorId !== userId) throw new NotAuthorizedError();

    const existing = await communityRepository.findPostById(postId);
    if (!existing) throw new PostNotFoundError();

    const isPinned = (existing as { pinned: boolean }).pinned;
    if (!isPinned) {
      await communityRepository.unpinUserPosts(userId);
      await communityRepository.pinPost(postId, true);
      return { pinned: true };
    }

    await communityRepository.pinPost(postId, false);
    return { pinned: false };
  },

  async getTopPredictors(limit = 10) {
    const cacheKey = "top-predictors";
    const cached = await prisma.cachedApiCall.findUnique({ where: { cacheKey } });
    if (cached && cached.expiresAt > new Date()) {
      return cached.data as {
        id: string; username: string; name: string | null;
        image: string; total: number; correct: number; accuracyPct: number;
      }[];
    }

    const users = await communityRepository.findTopPredictors();
    const result = users
      .map((u) => {
        const total = u._count.posts;
        const correct = u.posts.filter((p) => p.predictionOutcome === PREDICTION_OUTCOME.CORRECT).length;
        return {
          id: u.id,
          username: u.username,
          name: u.name,
          image: getAvatarUrl(u.image, u.email),
          total,
          correct,
          accuracyPct: total >= 5 ? Math.round((correct / total) * 100) : 0,
        };
      })
      .filter((u) => u.total >= 5)
      .sort((a, b) => b.accuracyPct - a.accuracyPct)
      .slice(0, limit);

    await prisma.cachedApiCall.upsert({
      where: { cacheKey },
      create: { cacheKey, data: result as any, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) },
      update: { data: result as any, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) },
    });

    return result;
  },
};
