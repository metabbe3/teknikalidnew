import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { faqService } from "@/domains/faq/faq.service";

/**
 * Agent: Generate FAQ content for the site.
 * ~3 min for 3 FAQs.
 * No content_quality chain — FAQs are standalone content.
 */
export class GenFaqAgent extends BaseAgent {
  readonly type: AgentType = "gen_faq" as AgentType;
  readonly label = "Generate FAQ";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const count = (payload.count as number) || 3;
    const result = await faqService.runDailyGeneration(count);
    return {
      summary: `FAQ: ${result.generated.length} generated, ${result.errors.length} errors`,
      ...result,
    };
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
