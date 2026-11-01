/**
 * Coherent meta description generator for kenapa-naik-hari-ini and kenapa-turun-hari-ini pages.
 * Resolves semantic contradictions (arah harga × arah sinyal) into realistic Indonesian copy.
 */

export type PriceDirection = "naik" | "turun" | "datar";
export type SignalTone = "menguat" | "melemah" | "netral";

export interface KenapaMetaInput {
  ticker: string;
  name?: string;
  changePercent: number | null;
  signalTone: SignalTone;
}

export function generateKenapaMetaDescription(opts: KenapaMetaInput): string {
  const { ticker, changePercent, signalTone } = opts;
  const pct = changePercent !== null ? Math.abs(changePercent).toFixed(1) : "0";
  const isNaik = changePercent !== null && changePercent > 0;
  const isTurun = changePercent !== null && changePercent < 0;

  if (isNaik) {
    if (signalTone === "menguat") {
      return `${ticker} naik ${pct}% didorong penguatan sinyal teknikal — momentum beli dominan di pasar.`;
    }
    if (signalTone === "melemah") {
      return `${ticker} naik ${pct}% meski sinyal teknikal melemah — kemungkinan technical rebound.`;
    }
    return `${ticker} naik ${pct}% di tengah sinyal teknikal netral — pantau volume dan konfirmasi tren.`;
  }

  if (isTurun) {
    if (signalTone === "melemah") {
      return `${ticker} turun ${pct}% seiring pelemahan sinyal teknikal — tekanan jual mendominasi pasar.`;
    }
    if (signalTone === "menguat") {
      return `${ticker} turun ${pct}% meski sinyal teknikal menguat — potensi buy on weakness pada support.`;
    }
    return `${ticker} turun ${pct}% di tengah sinyal teknikal netral — konsolidasi tanpa perubahan tren mayor.`;
  }

  return `${ticker} bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.`;
}

export function determineSignalTone(
  primaryDriverTone?: "bullish" | "bearish" | "neutral" | null,
  signalScore?: number | null,
): SignalTone {
  if (primaryDriverTone === "bullish") return "menguat";
  if (primaryDriverTone === "bearish") return "melemah";
  if (signalScore !== undefined && signalScore !== null) {
    if (signalScore > 0.15) return "menguat";
    if (signalScore < -0.15) return "melemah";
  }
  return "netral";
}
