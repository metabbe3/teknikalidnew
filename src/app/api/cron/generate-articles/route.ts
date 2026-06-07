import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";
import { newsSourceService } from "@/domains/article/news-source.service";
import { agentHubService } from "@/domains/agent-hub/agent-hub.service";
import { faqService } from "@/domains/faq/faq.service";
import { prisma } from "@/lib/prisma";
import { withCronLogging } from "@/domains/cron-monitoring/with-cron-logging";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  // Allow count override via query param (e.g. ?count=5)
  const url = new URL(request.url);
  const countOverride = Number(url.searchParams.get("count"));

  try {
    const { status, body } = await withCronLogging("generate-articles", async () => {
      const result: Record<string, unknown> = {};
      const startTime = new Date();

      // 1. Daily snapshots — weekdays only (needs fresh stock data)
      if (!isWeekend) {
        result.snapshots = await articleService.runDailySnapshotGeneration();
      }

      // 2. News from trusted sources (RSS → AI filter → article) — every day
      const sourcedCount = countOverride || 5;
      const sourcedNews = await newsSourceService.generateArticlesFromSources(sourcedCount);
      result.sourcedNews = sourcedNews;

      // 3. AI trending news — every day
      const newsCount = countOverride || Number(process.env.AI_DAILY_NEWS) || 5;
      result.news = await articleService.generateTrendingNews(newsCount);

      // 4. IDX40 evergreen analyses — every day
      const batchSize = Number(process.env.AI_DAILY_BATCH) || 2;
      result.evergreen = await articleService.runBatchGeneration(batchSize);

      // 5. Chain content_quality jobs for newly created DRAFT articles
      try {
        const newDrafts = await prisma.article.findMany({
          where: {
            status: "DRAFT",
            createdAt: { gte: startTime },
          },
          select: { id: true },
        });

        const qualityJobs: string[] = [];
        for (const draft of newDrafts) {
          const job = await agentHubService.createJob({
            agentType: "content_quality",
            payload: { articleId: draft.id },
            priority: 4,
          });
          qualityJobs.push(job.id);
        }
        result.qualityJobs = qualityJobs.length;
      } catch {
        // Chaining failure shouldn't fail the whole generation
        result.qualityJobs = 0;
      }

      // 6. Generate FAQ content
      try {
        const faqCount = Number(process.env.AI_DAILY_FAQ) || 3;
        result.faq = await faqService.runDailyGeneration(faqCount);
      } catch {
        result.faq = { generated: [], errors: ["FAQ generation failed"] };
      }

      return { status: 200, body: { data: result } as Record<string, unknown> };
    });
    return NextResponse.json(body, { status });
  } catch (error) {
    return handleApiError(error, "daily article generation");
  }
}
