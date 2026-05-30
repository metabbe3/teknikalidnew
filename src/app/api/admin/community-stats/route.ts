import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    totalPosts,
    postsToday,
    totalComments,
    commentsToday,
    totalLikes,
    pendingReports,
    reviewedReports,
    dismissedReports,
    topPosts,
    topFollowedStocks,
    topDiscussedStocks,
    topActiveUsers,
    dailyUsers,
    dailyPosts,
    dailyComments,
    likesTodayAgg,
    activeUsersToday,
    activeUsersThisWeek,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),

    prisma.post.count(),
    prisma.post.count({ where: { createdAt: { gte: todayStart } } }),

    prisma.comment.count(),
    prisma.comment.count({ where: { createdAt: { gte: todayStart } } }),

    prisma.like.count(),

    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "REVIEWED" } }),
    prisma.report.count({ where: { status: "DISMISSED" } }),

    prisma.post.findMany({
      where: { likesCount: { gt: 0 } },
      orderBy: { likesCount: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
        tickerTag: true,
        author: { select: { username: true, name: true, image: true } },
      },
    }),

    prisma.stockFollow.groupBy({
      by: ["ticker"],
      _count: { ticker: true },
      orderBy: { _count: { ticker: "desc" } },
      take: 5,
    }),

    prisma.post.groupBy({
      by: ["tickerTag"],
      where: { tickerTag: { not: null }, createdAt: { gte: weekStart } },
      _count: { tickerTag: true },
      orderBy: { _count: { tickerTag: "desc" } },
      take: 5,
    }),

    prisma.user.findMany({
      where: {
        OR: [
          { posts: { some: { createdAt: { gte: weekStart } } } },
          { comments: { some: { createdAt: { gte: weekStart } } } },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        reputation: true,
        _count: {
          select: {
            posts: { where: { createdAt: { gte: weekStart } } },
            comments: { where: { createdAt: { gte: weekStart } } },
          },
        },
      },
      take: 5,
    }),

    prisma.user.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: fourteenDaysAgo } },
      _count: true,
    }),

    prisma.post.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: fourteenDaysAgo } },
      _count: true,
    }),

    prisma.comment.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: fourteenDaysAgo } },
      _count: true,
    }),

    prisma.post.aggregate({
      _sum: { likesCount: true },
      where: { createdAt: { gte: todayStart } },
    }),

    prisma.user.count({
      where: {
        OR: [
          { posts: { some: { createdAt: { gte: todayStart } } } },
          { comments: { some: { createdAt: { gte: todayStart } } } },
        ],
      },
    }),

    prisma.user.count({
      where: {
        OR: [
          { posts: { some: { createdAt: { gte: weekStart } } } },
          { comments: { some: { createdAt: { gte: weekStart } } } },
        ],
      },
    }),
  ]);

  const dailyStats = aggregateDaily(
    [dailyUsers, dailyPosts, dailyComments],
    fourteenDaysAgo,
  );

  return NextResponse.json({
    overview: {
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      activeUsersToday,
      activeUsersThisWeek,
      totalPosts,
      postsToday,
      totalComments,
      commentsToday,
      totalLikes,
      likesToday: likesTodayAgg._sum.likesCount ?? 0,
    },
    moderation: {
      pending: pendingReports,
      reviewed: reviewedReports,
      dismissed: dismissedReports,
    },
    topPosts,
    topFollowedStocks: topFollowedStocks.map((s) => ({
      ticker: s.ticker,
      followers: s._count.ticker,
    })),
    topDiscussedStocks: topDiscussedStocks.map((s) => ({
      ticker: s.tickerTag!,
      posts: s._count.tickerTag,
    })),
    topActiveUsers: topActiveUsers.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image,
      reputation: Number(u.reputation),
      posts: u._count.posts,
      comments: u._count.comments,
    })),
    dailyStats,
  });
  } catch (error) {
    return handleApiError(error, "fetch community stats");
  }
}

function aggregateDaily(
  groups: Array<{ createdAt: Date; _count: number }[]>,
  since: Date,
) {
  const days: Record<string, { users: number; posts: number; comments: number }> = {};

  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days[key] = { users: 0, posts: 0, comments: 0 };
  }

  const keys = ["users", "posts", "comments"] as const;
  groups.forEach((group, idx) => {
    const key = keys[idx];
    for (const entry of group) {
      const date = new Date(entry.createdAt).toISOString().slice(0, 10);
      if (days[date]) {
        days[date][key] += entry._count;
      }
    }
  });

  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}
