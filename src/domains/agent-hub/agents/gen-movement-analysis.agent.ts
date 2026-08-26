import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { movementAnalysisService } from "@/domains/article/movement-analysis.service";

/**
 * Agent: Generate "Kenapa Saham X Naik/Turun Hari Ini?" articles.
 * Scans all stocks for >3% movers, generates SEO-optimized movement analysis.
 * Only triggers for stocks with significant moves — cost-efficient.
 * ~40-60 AI calls per run (only for qualifying stocks).
 */
export class GenMovementAnalysisAgent extends BaseAgent {
  readonly type: AgentType = "gen_movement_analysis" as AgentType;
  readonly label = "Generate Movement Analysis";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    // Default cap 25: top movers are processed first (sorted by % move), and
    // each run skips stocks already generated today — so 3x/day dispatch
    // (morning/lunch/afternoon) still covers all 40-60 movers without any
    // single run blowing past the 18-min agent timeout (~20s per stock).
    const maxStocks = (payload.maxStocks as number) ?? 25;
    const result = await movementAnalysisService.runBatchGeneration(maxStocks);
    return {
      summary: `Movement Analysis: ${result.generated.length} generated, ${result.skipped.length} skipped, ${result.errors.length} errors`,
      ...result,
    };
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
