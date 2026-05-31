import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";
import { newsSourceService } from "@/domains/article/news-source.service";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  try {
    const result: Record<string, unknown> = {};

    // 1. Daily snapshots — weekdays only (needs fresh stock data)
    if (!isWeekend) {
      result.snapshots = await articleService.runDailySnapshotGeneration();
    }

    // 2. News from trusted sources (RSS → AI filter → article) — every day
    const sourcedNews = await newsSourceService.generateArticlesFromSources(5);
    result.sourcedNews = sourcedNews;

    // 3. AI trending news — every day
    const newsCount = Number(process.env.AI_DAILY_NEWS) || 5;
    result.news = await articleService.generateTrendingNews(newsCount);

    // 4. IDX40 evergreen analyses — every day
    const batchSize = Number(process.env.AI_DAILY_BATCH) || 2;
    result.evergreen = await articleService.runBatchGeneration(batchSize);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "daily article generation");
  }
}
