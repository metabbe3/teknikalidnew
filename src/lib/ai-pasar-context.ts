// Pasar context builder — SATU PINTU (market-snapshot.service), dipakai screener + stock AI (juri Claude 30 Okt).
import { pasarLiveService } from "@/domains/stock/pasar-live.service";

// Loop 12 Nov (eval #5 = 7,5: jawaban "IHSG nyangsur 2,66%" padahal data +2,66% — model
// MEMBALIK arah saat menafsirkan angka mentah). Pola JURI-G3: arah diverbalisaskan server,
// model tinggal pakai — tidak menebak tanda dari changePercent.
function fmtAngka(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const neg = n < 0 ? "-" : "";
  const [int, dec] = Math.abs(n).toString().split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const d = dec ? "," + dec.slice(0, 2) : "";
  return `${neg}${grouped}${d}`;
}

function arahPct(p: number | null | undefined): string {
  if (p === null || p === undefined) return "tidak tersedia";
  const arah = p > 0 ? "naik" : p < 0 ? "turun" : "tetap di";
  return `${arah} ${fmtAngka(Math.abs(p))}%`;
}

export async function buildPasarContext(): Promise<Record<string, unknown> | null> {
  try {
    const snap = await pasarLiveService.getSnapshot(false);
    const ihsg = snap.ihsg ?? null;
    return {
      // arah = kalimat final server; field angka mentah tetap ada utk konteks tapi
      // prompt kedua route WAJIB menyuruh model memakai `arah` apa adanya.
      ihsg: ihsg
        ? { ...ihsg, arah: `IHSG ${arahPct(ihsg.changePercent)} ke ${fmtAngka(ihsg.close ?? null)}` }
        : null,
      topGainers: (snap.gainers ?? []).slice(0, 5).map((m) => ({ ticker: m.ticker, chg: m.changePercent, close: m.close })),
      topLosers: (snap.losers ?? []).slice(0, 5).map((m) => ({ ticker: m.ticker, chg: m.changePercent, close: m.close })),
      foreignNetBuy: (snap.foreign?.netBuy ?? []).slice(0, 5).map((f) => ({ ticker: f.ticker, netRp: f.netValue })),
      foreignNetSell: (snap.foreign?.netSell ?? []).slice(0, 5).map((f) => ({ ticker: f.ticker, netRp: f.netValue })),
      topSignals: (snap.topSignals ?? []).slice(0, 5).map((t) => ({ ticker: t.ticker, skor: t.signalScore, label: t.signalLabel })),
    };
  } catch {
    return null;
  }
}
