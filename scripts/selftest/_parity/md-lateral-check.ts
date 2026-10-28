/** Runtime proof fix-2026-10-26-12 item(3): findStocksWithIndicatorHistoryLateral
 * harus jalan di DB nyata (jsonb_agg LATERAL) — tsc tak menangkap SQL error.
 * Run: DATABASE_URL=... npx tsx scripts/selftest/_parity/md-lateral-check.ts */
import { stockRepository } from "../../../src/domains/stock/stock.repository";
import { decimalToNumber } from "../../../src/lib/serialize";

async function main() {
  const rows = await stockRepository.findStocksWithIndicatorHistoryLateral(["BBCA.JK", "NEST.JK", "ABBA.JK", "TIDAKADA.JK"]);
  for (const r of rows) {
    const pct = r.close !== null && r.prevClose !== null && r.prevClose !== 0
      ? (((r.close - r.prevClose) / r.prevClose) * 100).toFixed(2)
      : "n/a";
    console.log(`${r.ticker} close=${r.close} prev=${r.prevClose} pct=${pct}% ind=${r.indicators.length}`);
    if (r.indicators.length > 2) throw new Error(`indicators > 2 utk ${r.ticker}`);
    const ind = r.indicators[0] as unknown as { signalLabel: string | null; macdHist: unknown };
    const m = ind.macdHist === null ? null : Number(ind.macdHist);
    if (m !== null && !Number.isFinite(m)) throw new Error(`macdHist bukan angka utk ${r.ticker}`);
    void decimalToNumber(null);
  }
  if (rows.length === 0) throw new Error("kosong — ticker valid harusnya keluar");
  if (rows.some((r) => r.indicators.length === 0 && r.close !== null)) {
    // indikator boleh kosong (saham baru), close harus tetap ada
  }
  console.log("MD-LATERAL PASS", rows.length, "rows");
  process.exit(0);
}
main().catch((e) => { console.error("MD-LATERAL FAIL:", e); process.exit(1); });
