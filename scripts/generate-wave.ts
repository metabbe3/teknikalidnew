import { runScript } from "./lib/run";
import { prisma } from "../src/lib/prisma";
import { articleService } from "../src/domains/article/article.service";

/**
 * Phase 3 SEO — generate archetype landings for the next PENDING wave tickers.
 *
 * Reuses `articleService.generateStockAnalysis` (AI-unique per ticker — each landing
 * is written fresh from that stock's own indicators, NOT a boilerplate template, so
 * the corpus dodges the "scaled content" spam signal). Each landing is created
 * PUBLISHED but stays out of the sitemap (unpromoted) until an editor approves it at
 * /admin/review, which flips its WaveAssignment to PROMOTED.
 *
 * Usage: npx tsx --tsconfig tsconfig.json scripts/generate-wave.ts [--limit 3]
 * Remember the host-DB override: DATABASE_URL=...@localhost:5433/teknikalid
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] ?? ""]);
    return acc;
  }, []),
);
const LIMIT = Number(args.limit ?? 3);

runScript("generate-wave", async () => {
  const pending = await prisma.waveAssignment.findMany({
    where: { status: "PENDING" },
    orderBy: { rankedAt: "asc" },
    take: LIMIT,
  });
  if (pending.length === 0) {
    console.log("No PENDING wave assignments. Run rank-wave first.");
    return;
  }
  console.log(`Generating ${pending.length} wave landings (AI, ~3-5 min each)...`);
  for (const w of pending) {
    try {
      const r = await articleService.generateStockAnalysis(w.ticker);
      await prisma.waveAssignment.update({
        where: { id: w.id },
        data: { status: "GENERATED", landingArticleId: r.id },
      });
      console.log(`  ✓ ${w.ticker} → /berita/${r.slug}`);
      await new Promise((res) => setTimeout(res, 2000)); // gentle throttle
    } catch (e) {
      console.error(`  ✗ ${w.ticker}:`, e instanceof Error ? e.message : e);
    }
  }
});
