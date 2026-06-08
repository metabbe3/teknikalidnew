import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

/**
 * Growth Monitor
 *
 * Records site metrics for tracking growth over time.
 * No AI calls — pure data aggregation.
 */
export class GrowthMonitorAgent extends BaseAgent {
  readonly type: AgentType = "growth_monitor" as AgentType;
  readonly label = "Growth Monitor";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const diagnosis = (payload.diagnosis as Record<string, unknown>) || {};

    const articlesByType = await prisma.article.groupBy({
      by: ["articleType"],
      where: { status: "PUBLISHED" },
      _count: { id: true },
    });

    const faqByCategory = await prisma.question.groupBy({
      by: ["category"],
      where: { status: "ANSWERED" },
      _count: { id: true },
    });

    const latestArticle = await prisma.article.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true, title: true },
    });

    const totalStocks = await prisma.stock.count({ where: { isActive: true } });
    const coveredTickers = await prisma.article.findMany({
      where: { status: "PUBLISHED", tickerTag: { not: null } },
      select: { tickerTag: true },
    });
    const uniqueTickersCovered = new Set(coveredTickers.map((a) => a.tickerTag)).size;

    // Schema coverage — check recent articles that have generationMeta
    const recentForSchema = await prisma.article.findMany({
      where: { status: "PUBLISHED", articleType: { in: ["NEWS", "STOCK_ANALYSIS", "EDUCATIONAL"] } },
      select: { generationMeta: true },
      take: 100,
      orderBy: { publishedAt: "desc" },
    });
    const articlesWithSchema = recentForSchema.filter((a) => {
      const meta = a.generationMeta as Record<string, unknown> | null;
      return meta && meta.schemaJsonLd;
    }).length;

    const articlesWithTagsResult = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) as cnt FROM "Article"
      WHERE status = 'PUBLISHED' AND tags IS NOT NULL AND array_length(tags, 1) > 0
    `;
    const articlesWithTags = Number(articlesWithTagsResult[0]?.cnt ?? 0);

    const articlesWithExcerpt = await prisma.article.count({
      where: { status: "PUBLISHED", excerpt: { not: "" } },
    });

    const totalPublished = articlesByType.reduce((sum, a) => sum + a._count.id, 0);

    const metrics = {
      timestamp: new Date().toISOString(),
      articles: {
        total: totalPublished,
        byType: Object.fromEntries(articlesByType.map((a) => [a.articleType, a._count.id])),
        withSchema: articlesWithSchema,
        withTags: articlesWithTags,
        withExcerpt: articlesWithExcerpt,
        schemaCoverage: totalPublished > 0 ? `${((articlesWithSchema / totalPublished) * 100).toFixed(1)}%` : "0%",
        tagsCoverage: totalPublished > 0 ? `${((articlesWithTags / totalPublished) * 100).toFixed(1)}%` : "0%",
        metaCoverage: totalPublished > 0 ? `${((articlesWithExcerpt / totalPublished) * 100).toFixed(1)}%` : "0%",
      },
      faq: {
        total: faqByCategory.reduce((sum, f) => sum + f._count.id, 0),
        byCategory: Object.fromEntries(faqByCategory.map((f) => [f.category, f._count.id])),
      },
      stocks: {
        total: totalStocks,
        covered: uniqueTickersCovered,
        coverage: totalStocks > 0 ? `${((uniqueTickersCovered / totalStocks) * 100).toFixed(1)}%` : "0%",
      },
      freshness: latestArticle
        ? {
            lastPublished: latestArticle.publishedAt.toISOString(),
            hoursAgo: Math.round((Date.now() - latestArticle.publishedAt.getTime()) / 3600000),
          }
        : null,
      diagnosis,
    };

    return {
      summary: `Growth: ${totalPublished} articles (${metrics.articles.schemaCoverage} schema, ${metrics.articles.tagsCoverage} tags), ${metrics.faq.total} FAQs, ${uniqueTickersCovered}/${totalStocks} stocks`,
      metrics,
    };
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
