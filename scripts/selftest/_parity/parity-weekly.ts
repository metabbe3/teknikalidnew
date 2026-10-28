/**
 * Parity fisik fix-2026-10-26-10: OLD (HEAD pre-refactor) vs NEW engine
 * getWeeklyReport — output JSON harus IDENTIK untuk minggu-minggu nyata.
 * Run: npx tsx scripts/selftest/_parity/parity-weekly.ts
 */
import { weeklyReportService as OLD } from "./weekly-report.OLD";
import { weeklyReportService as NEW } from "../../../src/domains/stock/weekly-report.service";

function stable(o: unknown): string {
  return JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
}

async function main() {
  const weeks = await NEW.getRecentWeeks(3);
  let allOk = true;
  for (const w of weeks) {
    const [a, b] = await Promise.all([OLD.getWeeklyReport(w), NEW.getWeeklyReport(w)]);
    if (a === null || b === null) {
      console.log(`week ${w.toISOString().slice(0, 10)}: old=${a ? "data" : "null"} new=${b ? "data" : "null"} ${a === b ? "OK(null-parity)" : "MISMATCH"}`);
      if (a !== b) allOk = false;
      continue;
    }
    const sa = stable(a);
    const sb = stable(b);
    const ok = sa === sb;
    if (!ok) allOk = false;
    console.log(
      `week ${w.toISOString().slice(0, 10)}: ${ok ? "IDENTIK" : "DRIFT!"} ` +
      `(breadth ${JSON.stringify(b.breadth)} ihsg% ${b.ihsg.changePercent?.toFixed(4)} sektor=${b.sectors.length} gc/dc=${b.goldenCrosses.length}/${b.deathCrosses.length} gainers=[${b.topGainers.map(g => g.ticker).join(",")}] len old/new ${sa.length}/${sb.length})`,
    );
    if (!ok) {
      // diff karakter pertama
      let i = 0; while (i < sa.length && sa[i] === sb[i]) i++;
      console.log(`  first-diff @${i}:\n   old: ...${sa.slice(Math.max(0, i - 40), i + 60)}\n   new: ...${sb.slice(Math.max(0, i - 40), i + 60)}`);
    }
  }
  console.log(allOk ? "\nPARITY: PASS (3 minggu identik bit-per-bit)" : "\nPARITY: FAIL");
  process.exit(allOk ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
