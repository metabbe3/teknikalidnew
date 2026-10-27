/** Parity fisik screener: OLD (HEAD) vs NEW engine — preset yang disentuh refactor. */
import { screenerAnalysisService as OLD } from "./screener.OLD";
import { screenerAnalysisService as NEW } from "../../../src/domains/stock/screener-analysis.service";

async function main() {
  const presets = ["volume_spike", "volume_spike_low", "hype_alert"];
  let allOk = true;
  for (const p of presets) {
    // bypass cache 5-menit: pakai _uncached langsung (apples-to-apples)
    const [a, b] = await Promise.all([OLD._screenerQueryUncached(p), NEW._screenerQueryUncached(p)]);
    const sa = JSON.stringify(a, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
    const sb = JSON.stringify(b, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
    const ok = sa === sb;
    if (!ok) allOk = false;
    console.log(`${p}: ${ok ? "IDENTIK" : "DRIFT!"} (${a.length} rows, len ${sa.length}/${sb.length})`);
    if (!ok) { let i = 0; while (i < sa.length && sa[i] === sb[i]) i++; console.log(`  diff@${i}: old ${sa.slice(i, i + 90)} | new ${sb.slice(i, i + 90)}`); }
  }
  console.log(allOk ? "\nPARITY SCREENER: PASS" : "\nPARITY SCREENER: FAIL");
  process.exit(allOk ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
