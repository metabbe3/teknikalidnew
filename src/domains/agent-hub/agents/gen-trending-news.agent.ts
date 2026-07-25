import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { articleService } from "@/domains/article/article.service";

/**
 * Agent: AI-generated trending financial news articles.
 * Uses AI to identify trending topics and generate original articles.
 * ~5 min for 5 articles.
 * After completion, chains content_quality jobs for each new article.
 */
export class GenTrendingNewsAgent extends BaseAgent {
  readonly type: AgentType = "gen_trending_news" as AgentType;
  readonly label = "Generate Trending News";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const count = (payload.count as number) || 3;
    const result = await articleService.generateTrendingNews(count);

    return {
      summary: `Trending news: ${result.generated.length} generated, ${result.errors.length} errors`,
      generated: result.generated,
      articleIds: result.articleIds,
      errors: result.errors,
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
