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

const pctFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function generateKenapaMetaDescription(opts: KenapaMetaInput): string {
  const { ticker, changePercent, signalTone } = opts;

  // Guard: non-finite (NaN, Infinity, -Infinity), null, atau deadband |changePercent| < 0.5
  // sama dengan verdict-prose: sub-0.5% dianggap datar agar tidak keluar "naik 0.0%" atau "Infinity%".
  if (
    changePercent === null ||
    !Number.isFinite(changePercent) ||
    Math.abs(changePercent) < 0.5
  ) {
    return `${ticker} bergerak relatif datar hari ini — pantau indikator RSI, MACD, dan level support-resistance.`;
  }

  const pct = pctFormatter.format(Math.abs(changePercent));
  const isNaik = changePercent >= 0.5;
  const isTurun = changePercent <= -0.5;

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

/**
 * Threshold sinyal teknikal diselaraskan dengan distribusi riil skor pasar
 * (P5/P95 terdokumentasi di utils.ts:177). Skor di atas +0.34 (~P95) mencerminkan
 * penguatan kuat, sementara di bawah -0.20 mencerminkan pelemahan signifikan.
 * Di antara rentang tersebut dianggap netral / konsolidasi.
 */
export function determineSignalTone(
  primaryDriverTone?: "bullish" | "bearish" | "neutral" | null,
  signalScore?: number | null,
): SignalTone {
  if (primaryDriverTone === "bullish") return "menguat";
  if (primaryDriverTone === "bearish") return "melemah";
  if (signalScore !== undefined && signalScore !== null && Number.isFinite(signalScore)) {
    if (signalScore > 0.34) return "menguat";
    if (signalScore < -0.20) return "melemah";
  }
  return "netral";
}
