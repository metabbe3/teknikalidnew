import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { wibDayStart } from "@/lib/datetime-wib";
import { aggregateDaily } from "@/lib/utils";
import { PREDICTION_OUTCOME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  const now = new Date();
  // WIB calendar day (00:00 WIB) — was server-local midnight, i.e. 07:00 WIB on the UTC container.
  const todayStart = wibDayStart();
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
  // Aggregated in SQL — was loading every user's full prediction-post relation
  // into JS just to count CORRECT outcomes.
  const groups = await prisma.post.groupBy({
    by: ["authorId", "predictionOutcome"],
    where: { predictionOutcome: { not: null } },
    _count: { _all: true },
  });

  const byUser = new Map<string, { total: number; correct: number }>();
  for (const g of groups) {
    const e = byUser.get(g.authorId) ?? { total: 0, correct: 0 };
    e.total += g._count._all;
    if (g.predictionOutcome === PREDICTION_OUTCOME.CORRECT) e.correct += g._count._all;
    byUser.set(g.authorId, e);
  }

  const eligible = [...byUser.entries()]
    .filter(([, s]) => s.total >= 5)
    .sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total)
    .slice(0, 10);
  if (eligible.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: eligible.map(([id]) => id) } },
    select: { id: true, username: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return eligible
    .map(([id, s]) => {
      const u = userMap.get(id);
      return {
        id,
        username: u?.username ?? "?",
        name: u?.name ?? null,
        image: u?.image ?? null,
        total: s.total,
        correct: s.correct,
        accuracyPct: Math.round((s.correct / s.total) * 100),
      };
    });
}
