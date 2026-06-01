import { prisma } from "@/lib/prisma";
import { getAvatarUrl } from "@/lib/avatar";

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  image: true,
  customTitle: true,
} as const;

type AuthorRow = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  image: string | null;
  customTitle: string | null;
};

export function serializeAuthor(author: AuthorRow) {
  const { email, image, ...rest } = author;
  return { ...rest, image: getAvatarUrl(image, email) };
}

export const communityRepository = {
  // Posts

  createPost(data: {
    content: string;
    authorId: string;
    tickerTag: string | null;
    predictionDirection: string | null;
    predictionTarget: number | null;
    imageUrl: string | null;
    tags?: string[];
  }) {
    return prisma.post.create({
      data: {
        content: data.content,
        authorId: data.authorId,
        tickerTag: data.tickerTag,
        predictionDirection: data.predictionDirection,
        predictionTarget: data.predictionTarget
          ? String(data.predictionTarget)
          : null,
        imageUrl: data.imageUrl,
        tags: data.tags?.length
          ? { create: data.tags.map((tag) => ({ tag })) }
          : undefined,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
  },

  findPostById(id: string, userId?: string) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        comments: {
          take: 21,
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: AUTHOR_SELECT },
            replies: {
              orderBy: { createdAt: "asc" },
              include: { author: { select: AUTHOR_SELECT } },
            },
          },
        },
      },
    });
  },

  findPostsFeed(params: {
    cursor?: string;
    limit: number;
    sort?: "trending";
    followingFilter?:
      | { OR: { authorId?: { in: string[] }; tickerTag?: { in: string[] } }[] }
      | undefined;
    userId?: string;
  }) {
    const where: Record<string, unknown> = {
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    };

    if (params.followingFilter) {
      where.OR = params.followingFilter.OR;
    }

    if (params.sort === "trending") {
      where.createdAt = {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    }

    const orderBy =
      params.sort === "trending"
        ? ([
            { pinned: "desc" as const },
            { likesCount: "desc" as const },
            { commentsCount: "desc" as const },
            { createdAt: "desc" as const },
          ])
        : [{ pinned: "desc" as const }, { createdAt: "desc" as const }];

    return prisma.post.findMany({
      take: params.limit + 1,
      where,
      orderBy,
      include: {
        author: { select: AUTHOR_SELECT },
        likes: params.userId
          ? { where: { userId: params.userId }, select: { id: true } }
          : false,
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
    });
  },

  searchPosts(params: {
    query: string;
    ticker?: string;
    cursor?: string;
    limit: number;
    userId?: string;
  }) {
    const where: Record<string, unknown> = {
      content: { contains: params.query, mode: "insensitive" },
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    };
    if (params.ticker) where.tickerTag = params.ticker;

    return prisma.post.findMany({
      take: params.limit + 1,
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: params.userId
          ? { where: { userId: params.userId }, select: { id: true } }
          : false,
        poll: { include: { options: { orderBy: { order: "asc" } } } },
      },
    });
  },

  findPostAuthorId(id: string) {
    return prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
  },

  deletePost(id: string) {
    return prisma.$transaction([
      prisma.like.deleteMany({ where: { postId: id } }),
      prisma.bookmark.deleteMany({ where: { postId: id } }),
      prisma.comment.deleteMany({ where: { postId: id } }),
      prisma.post.delete({ where: { id } }),
    ]);
  },

  updatePost(id: string, data: { content: string }) {
    return prisma.post.update({
      where: { id },
      data: { content: data.content },
      include: { author: { select: AUTHOR_SELECT } },
    });
  },

  // Comments

  findCommentById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true, postId: true },
    });
  },

  findParentComment(id: string) {
    return prisma.comment.findUnique({ where: { id } });
  },

  deleteComment(id: string, postId: string | null) {
    const ops = [prisma.comment.delete({ where: { id } })] as const;
    if (postId) {
      return prisma.$transaction([
        prisma.comment.delete({ where: { id } }),
        prisma.post.update({
          where: { id: postId },
          data: { commentsCount: { decrement: 1 } },
        }),
      ]);
    }
    return prisma.$transaction([prisma.comment.delete({ where: { id } })]);
  },

  createComment(params: {
    content: string;
    authorId: string;
    postId: string | null;
    stockTicker: string | null;
    parentId: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          content: params.content,
          authorId: params.authorId,
          postId: params.postId,
          stockTicker: params.stockTicker,
          parentId: params.parentId,
        },
        include: { author: { select: AUTHOR_SELECT } },
      });

      if (params.postId) {
        await tx.post.update({
          where: { id: params.postId },
          data: { commentsCount: { increment: 1 } },
        });
      }

      return created;
    });
  },

  findStockTickerComments(ticker: string) {
    return Promise.all([
      prisma.post.findMany({
        where: { tickerTag: ticker },
        orderBy: { createdAt: "desc" },
        include: { author: { select: AUTHOR_SELECT } },
      }),
      prisma.comment.findMany({
        where: { stockTicker: ticker },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: AUTHOR_SELECT },
          parent: {
            select: {
              id: true,
              content: true,
              author: { select: AUTHOR_SELECT },
            },
          },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: AUTHOR_SELECT },
              parent: {
                select: {
                  id: true,
                  content: true,
                  author: { select: AUTHOR_SELECT },
                },
              },
            },
          },
        },
      }),
    ]);
  },

  // Likes

  findLike(userId: string, postId: string) {
    return prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
  },

  createLike(userId: string, postId: string) {
    return prisma.$transaction([
      prisma.like.create({ data: { userId, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
  },

  deleteLike(userId: string, postId: string) {
    return prisma.$transaction([
      prisma.like.delete({
        where: { userId_postId: { userId, postId } },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
  },

  // Bookmarks

  findBookmark(userId: string, postId: string) {
    return prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId } },
    });
  },

  createBookmark(userId: string, postId: string) {
    return prisma.bookmark.create({ data: { userId, postId } });
  },

  deleteBookmark(id: string) {
    return prisma.bookmark.delete({ where: { id } });
  },

  getTrendingTags(days: number, limit: number) {
    return prisma.postTag.groupBy({
      by: ["tag"],
      _count: { tag: true },
      where: { post: { createdAt: { gte: new Date(Date.now() - days * 86400000) } } },
      orderBy: { _count: { tag: "desc" } },
      take: limit,
    });
  },

  findPostsByTag(params: {
    tag: string;
    cursor?: string;
    limit: number;
    userId?: string;
  }) {
    const where: Record<string, unknown> = {
      tags: { some: { tag: params.tag } },
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    };

    return prisma.post.findMany({
      take: params.limit + 1,
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: params.userId
          ? { where: { userId: params.userId }, select: { id: true } }
          : false,
      },
    });
  },

  findUserBookmarks(userId: string) {
    return prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: { author: { select: AUTHOR_SELECT } },
        },
      },
    });
  },

  findUnresolvedPredictions(minAgeDays: number) {
    const cutoff = new Date(Date.now() - minAgeDays * 86400000);
    return prisma.post.findMany({
      where: {
        predictionDirection: { not: null },
        predictionOutcome: null,
        tickerTag: { not: null },
        createdAt: { lte: cutoff },
      },
      select: {
        id: true,
        tickerTag: true,
        predictionDirection: true,
        predictionTarget: true,
        createdAt: true,
      },
    });
  },

  updatePredictionOutcome(id: string, outcome: string) {
    return prisma.post.update({
      where: { id },
      data: { predictionOutcome: outcome, predictionResolvedAt: new Date() },
    });
  },

  getUserPredictionStats(userId: string) {
    return prisma.post.groupBy({
      by: ["predictionOutcome"],
      where: {
        authorId: userId,
        predictionOutcome: { not: null },
      },
      _count: { predictionOutcome: true },
    });
  },

  // Reposts

  findRepost(userId: string, postId: string) {
    return prisma.repost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
  },

  createRepost(userId: string, postId: string) {
    return prisma.$transaction([
      prisma.repost.create({ data: { userId, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { repostsCount: { increment: 1 } },
      }),
    ]);
  },

  deleteRepost(userId: string, postId: string) {
    return prisma.$transaction([
      prisma.repost.delete({
        where: { userId_postId: { userId, postId } },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { repostsCount: { decrement: 1 } },
      }),
    ]);
  },

  findRepostsByUser(userId: string, postIds: string[]) {
    return prisma.repost.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
  },

  // Top Contributors

  getTopContributors(limit: number) {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return prisma.post.groupBy({
      by: ["authorId"],
      where: { createdAt: { gte: weekAgo } },
      _sum: { likesCount: true, commentsCount: true },
      orderBy: { _sum: { likesCount: "desc" } },
      take: limit,
    });
  },

  getTrendingTagsWithTrend(currentDays: number, priorDays: number, limit: number) {
    const now = new Date();
    const currentStart = new Date(now.getTime() - currentDays * 86400000);
    const priorStart = new Date(now.getTime() - (currentDays + priorDays) * 86400000);

    return Promise.all([
      prisma.postTag.groupBy({
        by: ["tag"],
        _count: { tag: true },
        where: { post: { createdAt: { gte: currentStart } } },
        orderBy: { _count: { tag: "desc" } },
        take: limit,
      }),
      prisma.postTag.groupBy({
        by: ["tag"],
        _count: { tag: true },
        where: {
          post: {
            createdAt: { gte: priorStart, lt: currentStart },
          },
        },
      }),
    ]);
  },

  findReaction(userId: string, postId: string) {
    return prisma.reaction.findUnique({
      where: { userId_postId: { userId, postId } },
    });
  },

  createReaction(userId: string, postId: string, type: string) {
    return prisma.reaction.create({
      data: { userId, postId, type: type as any },
    });
  },

  deleteReaction(userId: string, postId: string) {
    return prisma.reaction.delete({
      where: { userId_postId: { userId, postId } },
    });
  },

  getReactionCounts(postId: string) {
    return prisma.reaction.groupBy({
      by: ["type"],
      _count: { type: true },
      where: { postId },
    });
  },

  getUserReaction(userId: string, postId: string) {
    return prisma.reaction.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { type: true },
    });
  },

  getReactionsForPosts(postIds: string[], userId?: string) {
    return Promise.all([
      prisma.reaction.groupBy({
        by: ["postId", "type"],
        _count: { type: true },
        where: { postId: { in: postIds } },
      }),
      userId
        ? prisma.reaction.findMany({
            where: { userId, postId: { in: postIds } },
            select: { postId: true, type: true },
          })
        : [],
    ]);
  },

  createPoll(postId: string, options: string[]) {
    return prisma.poll.create({
      data: {
        postId,
        options: {
          create: options.map((text, i) => ({ text, order: i })),
        },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });
  },

  findPollByPostId(postId: string) {
    return prisma.poll.findUnique({
      where: { postId },
      include: { options: { orderBy: { order: "asc" } } },
    });
  },

  findUserVote(userId: string, pollId: string) {
    return prisma.pollVote.findUnique({
      where: { userId_pollId: { userId, pollId } },
    });
  },

  createVote(optionId: string, pollId: string, userId: string) {
    return prisma.pollVote.create({
      data: { optionId, pollId, userId },
    });
  },

  incrementOptionVotes(optionId: string) {
    return prisma.pollOption.update({
      where: { id: optionId },
      data: { votesCount: { increment: 1 } },
    });
  },

  deleteVote(userId: string, pollId: string) {
    return prisma.pollVote.delete({
      where: { userId_pollId: { userId, pollId } },
    });
  },

  decrementOptionVotes(optionId: string) {
    return prisma.pollOption.update({
      where: { id: optionId },
      data: { votesCount: { decrement: 1 } },
    });
  },

  findVotesByUser(userId: string, pollIds: string[]) {
    return prisma.pollVote.findMany({
      where: { userId, pollId: { in: pollIds } },
      select: { pollId: true, optionId: true },
    });
  },

  pinPost(id: string, pinned: boolean) {
    return prisma.post.update({
      where: { id },
      data: { pinned },
    });
  },

  unpinUserPosts(authorId: string) {
    return prisma.post.updateMany({
      where: { authorId, pinned: true },
      data: { pinned: false },
    });
  },

  findTopPredictors() {
    return prisma.user.findMany({
      where: {
        posts: { some: { predictionOutcome: { not: null } } },
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        email: true,
        customTitle: true,
        _count: {
          select: { posts: { where: { predictionOutcome: { not: null } } } },
        },
        posts: {
          where: { predictionOutcome: { not: null } },
          select: { predictionOutcome: true },
        },
      },
    });
  },
};
