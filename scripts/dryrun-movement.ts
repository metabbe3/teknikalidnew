/**
 * ops-2026-11-05-01 DRY-RUN ONLY — tidak menulis DB.
 *
 * Verifikasi guardrail kenapa-* end-to-end: movers SQL (SATU PINTU, prev-bar
 * LATERAL fix) → AI generate → guard pipeline → replay gate angka + as-of →
 * laporan JSON + file markdown di ~/.hermes/cache/scratch/movement-dryrun/.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dryrun-movement.ts [--min-change 1.0] [--max 4]
 * Exit: 0 = generated>0 && semua replay passed; 2 = ada replay fail; 3 = 0 generated.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { movementAnalysisService } from "../src/domains/article/movement-analysis.service";

function parseArgs(): { minChange: number; max: number } {
  const args = process.argv.slice(2);
  let minChange = 1.0;
  let max = 4;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--min-change") minChange = Number(args[++i]);
    else if (args[i] === "--max") max = Number(args[++i]);
  }
  return { minChange, max };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL wajib di-set (staging host 127.0.0.1:5433)");
    process.exit(3);
  }
  const { minChange, max } = parseArgs();
  const result = await movementAnalysisService.runBatchGeneration(max, {
    minChangePercent: minChange,
    dryRun: true,
  });

  const outDir = join(homedir(), ".hermes", "cache", "scratch", "movement-dryrun");
  mkdirSync(outDir, { recursive: true });

  const summary = result.generated.map((g) => ({
    slug: g.slug,
    status: g.status ?? null,
    asOf: g.asOfLong ?? null,
    replayPassed: g.replay?.passed ?? null,
    replayChecked: g.replay?.checked ?? null,
    failureKinds: g.replay?.failureKinds ?? [],
  }));

  for (const g of result.generated) {
    const footer = `\n<!-- asOf: ${g.asOfLong ?? "-"} | replay: passed=${g.replay?.passed} checked=${g.replay?.checked} kinds=${(g.replay?.failureKinds ?? []).join(",")} | status: ${g.status} -->`;
    writeFileSync(join(outDir, `${g.slug}.md`), `# ${g.title}\n\n${g.content ?? ""}\n${footer}`);
  }

  console.info(JSON.stringify(summary, null, 2));
  const allPassed = summary.every((s) => s.replayPassed === true);
  console.info(`TOTAL generated=${result.generated.length} allReplayPassed=${allPassed} errors=${result.errors.length}`);
  if (result.errors.length) console.info("ERRORS:", JSON.stringify(result.errors));

  if (result.generated.length === 0) process.exit(3);
  process.exit(allPassed ? 0 : 2);
}

main().catch((err) => {
  console.error("dryrun-movement fatal:", err instanceof Error ? err.message : err);
  process.exit(3);
});
