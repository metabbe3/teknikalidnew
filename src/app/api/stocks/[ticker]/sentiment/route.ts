import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  const sevenDaysAgo = subDays(new Date(), 7);

  const social = await prisma.post.aggregate({
    where: { tickerTag: ticker, createdAt: { gte: sevenDaysAgo } },
    _count: true,
    _sum: { likesCount: true, commentsCount: true },
  });

  const postCount = social._count;
  const totalLikes = social._sum.likesCount ?? 0;
  const totalComments = social._sum.commentsCount ?? 0;
  const sentimentScore = postCount * 1 + totalLikes * 0.5 + totalComments * 1;
  const isHighActivity = sentimentScore >= 10;

  return NextResponse.json({
    postCount,
    totalLikes,
    totalComments,
    sentimentScore,
    isHighActivity,
  });
}
