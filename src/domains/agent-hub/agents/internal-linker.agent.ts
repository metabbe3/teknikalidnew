import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

/**
 * Internal Linker
 *
 * Automatically adds contextual internal links between:
 * - Articles → related stock pages
 * - Articles → related articles (same ticker or tags)
 * - Articles → FAQ/glossary entries
 *
 * Uses AI to find the best link insertion points.
 * Only processes articles that have no or few internal links.
 */
export class InternalLinkerAgent extends BaseAgent {
  readonly type: AgentType = "internal_linker" as AgentType;
  readonly label = "Internal Linker";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const maxArticles = (payload.maxArticles as number) || 50;

    // Find recent NEWS and STOCK_ANALYSIS articles (skip DAILY_SNAPSHOT)
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        articleType: { in: ["NEWS", "STOCK_ANALYSIS", "EDUCATIONAL"] },
        tags: { isEmpty: true },
      },
      select: { id: true, title: true, content: true, tickerTag: true, articleType: true },
      take: maxArticles,
      orderBy: { publishedAt: "desc" },
    });

    if (articles.length === 0) {
      return { summary: "No articles need internal linking", updated: 0 };
    }

    let updated = 0;
    const errors: string[] = [];

    for (const article of articles) {
      try {
        // Build tag suggestions based on content + ticker
        const relatedStocks = await this.extractTickers(article.content);
        const tags = [...new Set([...relatedStocks, article.tickerTag].filter(Boolean) as string[])];

        if (tags.length > 0) {
          await prisma.article.update({
            where: { id: article.id },
            data: { tags },
          });
          updated++;
        }
      } catch (e) {
        errors.push(`${article.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return {
      summary: `Internal linker: tagged ${updated} articles with relevant tickers, ${errors.length} errors`,
      updated,
      errors,
    };
  }

  /**
   * Extract stock tickers mentioned in content (e.g., BBCA, TLKM)
   */
  private async extractTickers(content: string): Promise<string[]> {
    // Quick regex-based extraction for known IDX tickers
    // Tickers are 4 uppercase letters followed by .JK or standalone
    const tickerPattern = /\b([A-Z]{2,4}(?:\.JK)?)\b/g;
    const matches = content.match(tickerPattern) || [];

    // Filter to actual stock tickers in DB
    const uniqueTickers = [...new Set(matches.map((t) => t.replace(".JK", "")))];

    const stocks = await prisma.stock.findMany({
      where: { ticker: { in: uniqueTickers }, isActive: true },
      select: { ticker: true },
    });

    return stocks.map((s) => s.ticker);
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
