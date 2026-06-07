import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { gatherMarketContext, factCheckArticle, extractTickersFromText } from "../src/domains/article/article-fact-check";

const DELAY_MS = 3000;

async function main() {
  // Fetch all published NEWS articles
  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      articleType: { in: ["NEWS"] },
    },
    select: {
      id: true,
      title: true,
      content: true,
      generationMeta: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`[FactCheck] Found ${articles.length} published NEWS articles\n`);

  if (articles.length === 0) {
    console.log("[FactCheck] No articles to check.");
    return;
  }

  // Gather market context once (data won't change during script run)
  console.log("[FactCheck] Gathering market context...");
  const marketCtx = await gatherMarketContext();
  console.log(`[FactCheck] IHSG: ${marketCtx.ihsg.level?.toLocaleString("id-ID") ?? "N/A"}, USD/IDR: ${marketCtx.usdIdr?.toLocaleString("id-ID") ?? "N/A"}, Top stocks: ${marketCtx.topStocks.length}\n`);

  let passed = 0;
  let corrected = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`[${i + 1}/${articles.length}] Checking: ${article.title}`);

    // Skip articles already title-checked
    const meta = article.generationMeta as Record<string, string> | null;
    if (meta?.factCheckTitleCorrected) {
      console.log(`  → Skipped (already fact-checked including title)\n`);
      skipped++;
      continue;
    }

    try {
      const factCheck = await factCheckArticle(article.content, marketCtx, article.title);

      if (factCheck.passed) {
        console.log(`  → PASSED (${factCheck.meta.claimsChecked} claims checked)\n`);
        passed++;

        // Update meta even if passed (so we don't re-check)
        await prisma.article.update({
          where: { id: article.id },
          data: {
            generationMeta: {
              ...(meta ?? {}),
              factCheckPassed: "true",
              factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
              factCheckCheckedAt: factCheck.meta.checkedAt,
              factCheckTitleCorrected: "true",
            } as Record<string, string>,
          },
        });
      } else if (factCheck.correctedContent) {
        const titleFixed = factCheck.correctedTitle && factCheck.correctedTitle !== article.title;
        console.log(`  → CORRECTED ${factCheck.mismatches.length} errors${titleFixed ? " + TITLE" : ""}:`);
        for (const m of factCheck.mismatches) {
          console.log(`     - ${m.description}`);
        }
        if (titleFixed) {
          console.log(`     TITLE: "${article.title}"`);
          console.log(`          → "${factCheck.correctedTitle}"`);
        }
        console.log("");

        corrected++;

        await prisma.article.update({
          where: { id: article.id },
          data: {
            title: titleFixed ? factCheck.correctedTitle! : article.title,
            content: factCheck.correctedContent,
            generationMeta: {
              ...(meta ?? {}),
              factCheckPassed: "false",
              factCheckCorrected: "true",
              factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
              factCheckErrors: String(factCheck.mismatches.length),
              factCheckCheckedAt: factCheck.meta.checkedAt,
              factCheckTitleCorrected: "true",
              ...(titleFixed ? { factCheckTitleFixed: "true" } : {}),
            } as Record<string, string>,
          },
        });
      } else if (factCheck.correctedTitle && !factCheck.correctedContent) {
        // Title-only correction (content was already correct)
        console.log(`  → TITLE CORRECTED ${factCheck.mismatches.length} errors:`);
        for (const m of factCheck.mismatches) {
          console.log(`     - ${m.description}`);
        }
        console.log(`     TITLE: "${article.title}"`);
        console.log(`          → "${factCheck.correctedTitle}"`);
        console.log("");

        corrected++;

        await prisma.article.update({
          where: { id: article.id },
          data: {
            title: factCheck.correctedTitle,
            generationMeta: {
              ...(meta ?? {}),
              factCheckPassed: "false",
              factCheckCorrected: "true",
              factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
              factCheckErrors: String(factCheck.mismatches.length),
              factCheckCheckedAt: factCheck.meta.checkedAt,
              factCheckTitleCorrected: "true",
              factCheckTitleFixed: "true",
            } as Record<string, string>,
          },
        });
      } else {
        console.log(`  → FAILED (${factCheck.mismatches.length} errors, no correction available)\n`);
        failed++;
      }
    } catch (err) {
      console.error(`  → ERROR: ${err instanceof Error ? err.message : err}\n`);
      failed++;
    }

    // Rate limit between articles
    if (i < articles.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log("═══════════════════════════════════════");
  console.log("FACT-CHECK SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`Total articles:  ${articles.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Corrected:       ${corrected}`);
  console.log(`Failed:          ${failed}`);
  console.log(`Skipped:         ${skipped}`);
  console.log("═══════════════════════════════════════");
}

main()
  .catch((err) => {
    console.error("[FactCheck] Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
