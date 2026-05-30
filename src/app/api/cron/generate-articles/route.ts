import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip weekends (IDX market closed)
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) {
    return NextResponse.json({ data: { skipped: true, reason: "weekend" } });
  }

  try {
    // 1. Daily snapshots for all 956 stocks (template, instant)
    const snapshots = await articleService.runDailySnapshotGeneration();

    // 2. AI trending news articles (5-10 per day)
    const newsCount = Number(process.env.AI_DAILY_NEWS) || 10;
    const news = await articleService.generateTrendingNews(newsCount);

    // 3. IDX40 evergreen analyses (2 per day, AI)
    const batchSize = Number(process.env.AI_DAILY_BATCH) || 2;
    const evergreen = await articleService.runBatchGeneration(batchSize);

    return NextResponse.json({
      data: {
        snapshots,
        news,
        evergreen,
      },
    });
  } catch (error) {
    return handleApiError(error, "daily article generation");
  }
}
