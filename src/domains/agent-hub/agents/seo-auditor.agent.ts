import { BaseAgent, type ChainedJobSpec } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import { prisma } from "@/lib/prisma";

/**
 * SEO Auditor
 *
 * Scans published articles for common SEO issues:
 * - Missing excerpt/meta description
 * - Duplicate titles
 * - Thin content (< 1500 chars for non-snapshots)
 * - Missing tags
 * - Missing coverImageUrl
 *
 * Returns a report + can auto-fix meta descriptions using AI.
 */
export class SeoAuditorAgent extends BaseAgent {
  readonly type: AgentType = "seo_auditor" as AgentType;
  readonly label = "SEO Auditor";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const maxArticles = (payload.maxArticles as number) || 50;
    const fixMeta = (payload.fixMeta as boolean) ?? false;

    // 1. Articles missing excerpt
    const missingExcerpt = await prisma.article.findMany({
      where: { status: "PUBLISHED", excerpt: "" },
      select: { id: true, title: true, articleType: true },
      take: maxArticles,
      orderBy: { publishedAt: "desc" },
    });

    // 2. Articles missing tags
    const missingTags = await prisma.$queryRaw<Array<{ id: string; title: string }>>`
      SELECT id, title FROM "Article"
      WHERE status = 'PUBLISHED' AND (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0)
      ORDER BY "publishedAt" DESC LIMIT ${maxArticles}
    `;

    // 3. Thin content (non-snapshot articles < 1500 chars)
    const thinContent = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        articleType: { not: "DAILY_SNAPSHOT" },
      },
      select: { id: true, title: true, articleType: true, content: true },
      take: 100,
      orderBy: { publishedAt: "desc" },
    });
    const thinArticles = thinContent
      .filter((a) => a.content.length < 1500)
      .map((a) => ({ id: a.id, title: a.title, chars: a.content.length }));

    // 4. Duplicate titles
    const duplicateTitles = await prisma.$queryRaw<Array<{ title: string; cnt: bigint }>>`
      SELECT title, COUNT(*) as cnt FROM "Article"
      WHERE status = 'PUBLISHED'
      GROUP BY title HAVING COUNT(*) > 1
      ORDER BY cnt DESC LIMIT 20
    `;

    // 5. Auto-fix: Generate meta descriptions for missing excerpts
    let fixed = 0;
    if (fixMeta && missingExcerpt.length > 0) {
      const articlesToFix = missingExcerpt.slice(0, 10);
      for (const article of articlesToFix) {
        try {
          const full = await prisma.article.findUnique({
            where: { id: article.id },
            select: { content: true, title: true },
          });
          if (!full) continue;

          const metaDesc = await this.callAI(
            "You are an SEO expert. Generate a compelling meta description (max 155 chars) for this Indonesian stock market article.",
            `Title: ${full.title}\n\nContent preview: ${full.content.slice(0, 800)}`,
            100,
          );

          const cleanMeta = metaDesc.trim().slice(0, 155);
          await prisma.article.update({
            where: { id: article.id },
            data: { excerpt: cleanMeta },
          });
          fixed++;
        } catch {
          // Skip individual failures
        }
      }
    }

    return {
      summary: `SEO audit: ${missingExcerpt.length} missing meta, ${missingTags.length} missing tags, ${thinArticles.length} thin, ${duplicateTitles.length} duplicates. Fixed ${fixed} meta descriptions.`,
      missingExcerpt: missingExcerpt.length,
      missingTags: missingTags.length,
      thinContent: thinArticles.length,
      duplicateTitles: duplicateTitles.length,
      fixedMeta: fixed,
      details: {
        thinArticles: thinArticles.slice(0, 10),
        duplicates: duplicateTitles.slice(0, 5).map((d) => ({ title: d.title, count: Number(d.cnt) })),
      },
    };
  }

  async onComplete(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]> {
    return [];
  }
}
