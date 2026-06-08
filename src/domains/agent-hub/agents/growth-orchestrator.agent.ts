import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

/**
 * Growth Orchestrator (MANDOR)
 *
 * Analisa kondisi website, identify gaps, lalu dispatch specialist agents.
 * Jalan tiap 6 jam. Tidak generate konten sendiri — cuma koordinasi.
 *
 * Decision logic:
 * 1. Cek artikel tanpa meta description → dispatch seo_auditor
 * 2. Cek FAQ count < 100 → dispatch content_expander (FAQ mode)
 * 3. Cek thin content snapshots → dispatch content_expander (expand mode)
 * 4. Cek artikel tanpa internal links → dispatch internal_linker
 * 5. Cek artikel tanpa schema → dispatch schema_builder
 * 6. Selalu dispatch growth_monitor untuk tracking
 */
export class GrowthOrchestratorAgent extends BaseAgent {
  readonly type: AgentType = "growth_orchestrator" as AgentType;
  readonly label = "Growth Orchestrator";

  async execute(_payload: AgentJobPayload): Promise<AgentJobResult> {
    const dispatches: string[] = [];

    // 1. Check articles without meta/excerpt (SEO gap)
    const articlesWithoutMeta = await prisma.article.count({
      where: { status: "PUBLISHED", excerpt: "" },
    });

    // 2. Check thin content (DAILY_SNAPSHOT < 2000 chars)
    const thinContent = await prisma.article.count({
      where: {
        status: "PUBLISHED",
        articleType: "DAILY_SNAPSHOT",
        content: { lt: "a".repeat(2000) },
      },
    });

    // 3. Check FAQ count
    const faqCount = await prisma.question.count({
      where: { status: "ANSWERED" },
    });

    // 4. Check educational articles count
    const eduCount = await prisma.article.count({
      where: { status: "PUBLISHED", articleType: "EDUCATIONAL" },
    });

    // 5. Check articles with tags (needed for internal linking)
    const articlesWithoutTags = await prisma.article.count({
      where: { status: "PUBLISHED", tags: { isEmpty: true } },
    });

    // 6. Check glossary/akademi coverage
    const glossaryCount = await prisma.question.count({
      where: { category: "glosarium", status: "ANSWERED" },
    });

    const diagnosis = {
      articlesWithoutMeta,
      thinContent,
      faqCount,
      eduCount,
      articlesWithoutTags,
      glossaryCount,
    };

    // Build dispatch plan based on priority
    const jobs: Array<{ agentType: AgentType; payload: Record<string, unknown>; priority: number }> = [];

    // Priority 1: SEO fixes (high impact)
    if (articlesWithoutMeta > 50 || articlesWithoutTags > 100) {
      jobs.push({
        agentType: "seo_auditor" as AgentType,
        payload: { maxArticles: 50, fixMeta: true, addTags: true },
        priority: 3,
      });
      dispatches.push(`seo_auditor: ${articlesWithoutMeta} missing meta, ${articlesWithoutTags} missing tags`);
    }

    // Priority 2: Content expansion (FAQ & educational)
    if (faqCount < 100) {
      const faqNeeded = Math.min(100 - faqCount, 10);
      jobs.push({
        agentType: "content_expander" as AgentType,
        payload: { mode: "faq", count: faqNeeded },
        priority: 5,
      });
      dispatches.push(`content_expander(faq): need ${faqNeeded} more (have ${faqCount})`);
    }

    if (eduCount < 30) {
      jobs.push({
        agentType: "content_expander" as AgentType,
        payload: { mode: "educational", count: 3 },
        priority: 6,
      });
      dispatches.push(`content_expander(edu): need more (have ${eduCount})`);
    }

    if (glossaryCount < 50) {
      jobs.push({
        agentType: "content_expander" as AgentType,
        payload: { mode: "glossary", count: 10 },
        priority: 7,
      });
      dispatches.push(`content_expander(glossary): need ${Math.min(50 - glossaryCount, 10)} more (have ${glossaryCount})`);
    }

    // Priority 3: Internal linking
    if (articlesWithoutTags > 0) {
      jobs.push({
        agentType: "internal_linker" as AgentType,
        payload: { maxArticles: 50 },
        priority: 8,
      });
      dispatches.push(`internal_linker: ${articlesWithoutTags} articles need linking`);
    }

    // Priority 4: Schema (always good to check)
    jobs.push({
      agentType: "schema_builder" as AgentType,
      payload: { maxArticles: 20 },
      priority: 9,
    });
    dispatches.push("schema_builder: check latest 20 articles");

    // Priority 5: Growth monitor (always run for tracking)
    jobs.push({
      agentType: "growth_monitor" as AgentType,
      payload: { diagnosis },
      priority: 10,
    });
    dispatches.push("growth_monitor: record metrics");

    return {
      summary: `Orchestrator dispatched ${jobs.length} specialist jobs`,
      diagnosis,
      plannedJobs: dispatches,
      jobSpecs: jobs,
    };
  }

  async onComplete(result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    const specs = (result.jobSpecs as Array<{ agentType: AgentType; payload: Record<string, unknown>; priority: number }>) || [];
    return specs.map((s) => ({
      agentType: s.agentType,
      payload: s.payload,
      priority: s.priority,
    }));
  }
}
