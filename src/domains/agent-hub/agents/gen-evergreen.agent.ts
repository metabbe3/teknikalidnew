import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { articleService } from "@/domains/article/article.service";
import { prisma } from "@/lib/prisma";

/**
 * Agent: Generate IDX40 evergreen technical analysis articles.
 * Each run processes a small batch (typically 2 stocks).
 * ~5 min per batch.
 * After completion, chains content_quality jobs for each new DRAFT article.
 */
export class GenEvergreenAgent extends BaseAgent {
  readonly type: AgentType = "gen_evergreen" as AgentType;
  readonly label = "Generate Evergreen Analysis";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const batchSize = (payload.batchSize as number) || 2;
    const startTime = new Date();
    const result = await articleService.runBatchGeneration(batchSize);

    const newDrafts = await prisma.article.findMany({
      where: { status: "DRAFT", createdAt: { gte: startTime } },
      select: { id: true },
    });

    return {
      summary: `Evergreen: ${result.generated.length} generated, ${result.errors.length} errors, ${result.skipped.length} skipped`,
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
