import { communityRepository } from "./community.repository";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { eventBus } from "@/lib/event-bus";
import { stockRepository } from "@/domains/stock/stock.repository";
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

    return {
      data: items.map((post) => ({
        id: post.id,
        content: post.content,
        tickerTag: post.tickerTag,
        predictionDirection: post.predictionDirection ?? null,
        predictionTarget: post.predictionTarget
          ? String(post.predictionTarget)
          : null,
        imageUrl: post.imageUrl ?? null,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt.toISOString(),
        author: post.author,
        likedByMe: params.userId
          ? "likes" in post && Array.isArray(post.likes) && post.likes.length > 0
          : false,
      })),
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

    const post = await communityRepository.createPost({
      content: data.content,
      authorId: userId,
      tickerTag: data.tickerTag || null,
      predictionDirection: data.predictionDirection || null,
      predictionTarget: data.predictionTarget || null,
      imageUrl: data.imageUrl || null,
    });

    eventBus.emit("community:post-created", {
      postId: post.id,
      authorId: userId,
      tickerTag: data.tickerTag || null,
    });

    return post;
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
      imageUrl: post.imageUrl ?? null,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt,
      author: post.author,
      likedByMe: userId
        ? Array.isArray(post.likes) && post.likes.length > 0
        : false,
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
        author: b.post.author,
        bookmarkedAt: b.createdAt.toISOString(),
      })),
    };
  },
};
