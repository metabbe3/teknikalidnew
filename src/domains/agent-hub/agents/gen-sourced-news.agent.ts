import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { newsSourceService } from "@/domains/article/news-source.service";
import { prisma } from "@/lib/prisma";

/**
 * Agent: Scrape RSS news from trusted sources → AI filter → generate articles.
 * This is the most AI-intensive step (~5-8 min for 5 articles).
 * After completion, chains content_quality jobs for each new DRAFT article.
 */
export class GenSourcedNewsAgent extends BaseAgent {
  readonly type: AgentType = "gen_sourced_news" as AgentType;
  readonly label = "Generate Sourced News";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const count = (payload.count as number) || 5;
    const startTime = new Date();
    const result = await newsSourceService.generateArticlesFromSources(count);

    // Find article IDs created by this run for chaining
    const newDrafts = await prisma.article.findMany({
      where: { status: "DRAFT", createdAt: { gte: startTime } },
      select: { id: true },
    });

    return {
      summary: `Sourced news: ${result.generated.length} generated, ${result.errors.length} errors, ${result.skipped} skipped`,
      articleIds: newDrafts.map((a) => a.id),
      ...result,
    };
  }

  async onComplete(result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    const articleIds = (result.articleIds as string[]) || [];
    return articleIds.map((id) => ({
      agentType: "content_quality" as AgentType,
      payload: { articleId: id },
      priority: 4,
    }));
  }
}
