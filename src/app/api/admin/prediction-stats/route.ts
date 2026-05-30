import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { aggregateDaily } from "@/lib/utils";
import { PREDICTION_OUTCOME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [outcomeGroups, directionGroups, stockGroups, dailyVolume, recentPredictions] = await Promise.all([
    // Single groupBy replaces 5 separate count queries
    prisma.post.groupBy({
      by: ["predictionOutcome"],
      where: { predictionDirection: { not: null } },
      _count: { predictionOutcome: true },
    }),

    prisma.post.groupBy({
      by: ["predictionDirection"],
      where: { predictionDirection: { not: null } },
      _count: { predictionDirection: true },
    }),

    prisma.post.groupBy({
      by: ["tickerTag"],
      where: { predictionDirection: { not: null }, tickerTag: { not: null } },
      _count: { tickerTag: true },
      orderBy: { _count: { tickerTag: "desc" } },
      take: 10,
    }),

    prisma.post.groupBy({
      by: ["createdAt"],
      where: { predictionDirection: { not: null }, createdAt: { gte: fourteenDaysAgo } },
      _count: true,
    }),

    prisma.post.findMany({
      where: { predictionDirection: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        tickerTag: true,
        predictionDirection: true,
        predictionTarget: true,
        predictionOutcome: true,
        createdAt: true,
        author: { select: { username: true, name: true } },
      },
    }),
  ]);

  const byOutcome = new Map(outcomeGroups.map((g) => [g.predictionOutcome, g._count.predictionOutcome]));
  const totalPredictions = outcomeGroups.reduce((sum, g) => sum + g._count.predictionOutcome, 0);
  const pendingCount = byOutcome.get(null) ?? 0;
  const correctCount = byOutcome.get(PREDICTION_OUTCOME.CORRECT) ?? 0;
  const incorrectCount = byOutcome.get(PREDICTION_OUTCOME.INCORRECT) ?? 0;
  const expiredCount = byOutcome.get(PREDICTION_OUTCOME.EXPIRED) ?? 0;

  const topPredictors = await getTopPredictors();

  const resolved = correctCount + incorrectCount + expiredCount;
  const accuracyPct = resolved > 0 ? Math.round((correctCount / resolved) * 100) : 0;

  const dailyStats = aggregateDaily(dailyVolume, fourteenDaysAgo);

  return NextResponse.json({
    overview: {
      total: totalPredictions,
      pending: pendingCount,
      correct: correctCount,
      incorrect: incorrectCount,
      expired: expiredCount,
      accuracyPct,
    },
    distribution: {
      directions: directionGroups.map((g) => ({
        direction: g.predictionDirection!,
        count: g._count.predictionDirection,
      })),
      byStock: stockGroups.map((g) => ({
        ticker: g.tickerTag!,
        count: g._count.tickerTag,
      })),
    },
    topPredictors,
    dailyStats,
    recentPredictions: recentPredictions.map((p) => ({
      ...p,
      predictionTarget: p.predictionTarget ? Number(p.predictionTarget) : null,
    })),
  });
  } catch (error) {
    return handleApiError(error, "fetch prediction stats");
  }
}

async function getTopPredictors() {
  const users = await prisma.user.findMany({
    where: {
      posts: { some: { predictionOutcome: { not: null } } },
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      _count: {
        select: { posts: { where: { predictionOutcome: { not: null } } } },
      },
      posts: {
        where: { predictionOutcome: { not: null } },
        select: { predictionOutcome: true },
      },
    },
  });

  return users
    .map((u) => {
      const total = u._count.posts;
      const correct = u.posts.filter((p) => p.predictionOutcome === PREDICTION_OUTCOME.CORRECT).length;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        total,
        correct,
        accuracyPct: total >= 5 ? Math.round((correct / total) * 100) : null,
      };
    })
    .filter((u) => u.total >= 5)
    .sort((a, b) => (b.accuracyPct ?? 0) - (a.accuracyPct ?? 0))
    .slice(0, 10);
}
