/**
 * Validate draft articles that were just title-fixed, and republish those that pass.
 *
 * Criteria for republish:
 *   - status = DRAFT
 *   - generationMeta.titleFixedFromLeak = true (just fixed by fix-leaked-titles.ts)
 *   - Passes validateArticle() (no error-severity issues)
 *
 * Articles that fail validation remain DRAFT and are reported for manual review.
 */
import { prisma } from "../src/lib/prisma";
import { ArticleStatus } from "../src/generated/prisma/client";
import { runScript } from "./lib/run";
import { validateArticle } from "../src/domains/article/quality-validator";
import { extractTickersFromText } from "../src/domains/article/article-fact-check";

interface Args {
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  return { apply: argv.includes("--apply") };
}

/**
 * Derive a keyword list for validation. Use ticker tags found in content +
 * common categorical keywords derived from articleType.
 */
function deriveKeywords(article: { content: string; articleType: string; tags: string[] }): string[] {
  const tickers = extractTickersFromText(article.content.slice(0, 2000));
  const keywords: string[] = [];
  if (tickers.length > 0) keywords.push(tickers[0]);
  keywords.push("ihsg");
  keywords.push("pasar-saham");
  if (article.articleType === "NEWS") keywords.push("berita");
  return keywords;
}

runScript("validate-and-republish", async () => {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[validate-and-republish] Mode: ${args.apply ? "APPLY" : "DRY-RUN (no writes)"}`);
  console.log("");

  const drafts = await prisma.article.findMany({
    where: {
      status: ArticleStatus.DRAFT,
      generationMeta: { path: ["titleFixedFromLeak"], equals: "true" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      articleType: true,
      tags: true,
      publishedAt: true,
      generationMeta: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  console.log(`[validate-and-republish] Title-fixed drafts found: ${drafts.length}\n`);

  if (drafts.length === 0) {
    console.log("[validate-and-republish] Nothing to do. Exiting.");
    return;
  }

  let republished = 0;
  let kept = 0;

  for (const article of drafts) {
    const keywords = deriveKeywords(article);
    const result = validateArticle(article.content, article.title, keywords);

    const errorIssues = result.issues.filter((i) => i.severity === "error");
    const warningIssues = result.issues.filter((i) => i.severity === "warning");
    const passes = errorIssues.length === 0;

    console.log("─────────────────────────────────────────────");
    console.log(`Slug:     ${article.slug}`);
    console.log(`Title:    ${article.title}`);
    console.log(`Score:    ${result.score}/100 | Errors: ${errorIssues.length} | Warnings: ${warningIssues.length}`);
    console.log(`Meta:     words=${result.meta.wordCount}, h2=${result.meta.h2Count}, tickers=${result.meta.tickerCount}, cta=${result.meta.hasCta}, disclaimer=${result.meta.hasDisclaimer}, tips=${result.meta.tipCount}`);

    if (result.issues.length > 0) {
      console.log(`Issues:`);
      for (const issue of result.issues) {
        console.log(`  [${issue.severity.toUpperCase()}] ${issue.rule}: ${issue.message}`);
      }
    }

    if (passes) {
      console.log(`Action:   REPUBLISH (status PUBLISHED, isListed=true, bump publishedAt)`);
      republished++;

      if (args.apply) {
        const meta = (article.generationMeta as Record<string, string>) ?? {};
        await prisma.article.update({
          where: { id: article.id },
          data: {
            status: ArticleStatus.PUBLISHED,
            isListed: true,
            publishedAt: new Date(),
            version: { increment: 1 },
            generationMeta: {
              ...meta,
              republishedAfterTitleFix: "true",
              republishedAt: new Date().toISOString(),
              qualityScore: String(result.score),
            } as Record<string, string>,
          },
        });
        console.log(`→ Applied.`);
      }
    } else {
      console.log(`Action:   KEEP DRAFT (${errorIssues.length} blocking errors)`);
      kept++;
    }
    console.log("");
  }

  console.log("═══════════════════════════════════════");
  console.log("VALIDATE-AND-REPUBLISH SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`Title-fixed drafts:      ${drafts.length}`);
  console.log(`  → Republished:         ${republished}`);
  console.log(`  → Kept as draft:       ${kept}`);
  console.log(`Mode:                    ${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log("═══════════════════════════════════════");
  if (!args.apply) {
    console.log("Dry-run only. Re-run with --apply to persist changes.");
  }
});
