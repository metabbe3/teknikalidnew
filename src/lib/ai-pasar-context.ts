// Pasar context builder — SATU PINTU (market-snapshot.service), dipakai screener + stock AI (juri Claude 30 Okt).
import { pasarLiveService } from "@/domains/stock/pasar-live.service";

export async function buildPasarContext(): Promise<Record<string, unknown> | null> {
  try {
    const snap = await pasarLiveService.getSnapshot(false);
    return {
      ihsg: snap.ihsg ?? null,
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
