import { prisma } from "@/lib/prisma";

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

export const communityRepository = {
  // Posts

  createPost(data: {
    content: string;
    authorId: string;
    tickerTag: string | null;
    predictionDirection: string | null;
    predictionTarget: number | null;
    imageUrl: string | null;
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
            { likesCount: "desc" as const },
            { commentsCount: "desc" as const },
            { createdAt: "desc" as const },
          ])
        : [{ createdAt: "desc" as const }];

    return prisma.post.findMany({
      take: params.limit + 1,
      where,
      orderBy,
      include: {
        author: { select: AUTHOR_SELECT },
        likes: params.userId
          ? { where: { userId: params.userId }, select: { id: true } }
          : false,
      },
    });
  },

  findPostAuthorId(id: string) {
    return prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
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
};
