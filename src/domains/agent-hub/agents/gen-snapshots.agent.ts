import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { articleService } from "@/domains/article/article.service";

/**
 * Agent: Generate daily stock snapshots for all tracked stocks.
 * Runs on weekdays only (needs fresh stock data from market close).
 * Typically fast (~2 min) since it's mostly DB reads/writes.
 */
export class GenSnapshotsAgent extends BaseAgent {
  readonly type: AgentType = "gen_snapshots" as AgentType;
  readonly label = "Generate Snapshots";

  async execute(_payload: AgentJobPayload): Promise<AgentJobResult> {
    const result = await articleService.runDailySnapshotGeneration();
    return {
      summary: `Snapshots: ${result.generated} generated, ${result.errors} errors, ${result.skipped} skipped`,
      ...result,
    };
  }

  async onComplete(result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    // No content_quality chain for snapshots
    return [];
  }
}
