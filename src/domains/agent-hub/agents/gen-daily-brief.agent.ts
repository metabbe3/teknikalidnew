import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { articleService } from "@/domains/article/article.service";

/**
 * Agent: daily market brief — the market-wide NEWS article featured on /berita.
 * Grounded in live market data (gatherMarketContext) + fact-checked; tickers in
 * the body auto-link to stock pages, and stock pages surface the brief when
 * mentioned (articleRepository.findLatestBriefMentioning). One per WIB day.
 */
export class GenDailyBriefAgent extends BaseAgent {
  readonly type: AgentType = "gen_daily_brief" as AgentType;
  readonly label = "Generate Daily Brief";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    void payload;
    const result = await articleService.generateDailyBrief();

    if (result.skipped) {
      return { summary: `Daily brief skipped — today's brief already exists (${result.slug})` };
    }

    // AC4 (prd-2026-10-05-01): JobRun logs mismatch counts held/corrected per run
    const gate = result.factCheckGate;
    const gateNote = gate ? ` [fact-check: ${gate.action === "hold-draft" ? `HELD ${gate.mismatches} mismatch` : `corrected ${gate.mismatches}`}]` : "";
    return {
      summary: `Daily brief generated: ${result.title}${gateNote}`,
      articleIds: [result.id],
      slug: result.slug,
      ...(gate ? { factCheckGate: gate } : {}),
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
