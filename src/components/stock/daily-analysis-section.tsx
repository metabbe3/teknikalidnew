import { formatPrice, formatPercent, stripJk } from "@/lib/utils";
import { type ReactNode } from "react";

interface DailyAnalysisSectionProps {
  ticker: string;
  stockName: string;
  sector: string | null;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  week52High: number | null;
  week52Low: number | null;
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  adx: number | null;
  stochK: number | null;
  stochD: number | null;
  supertrend: number | null;
  atr: number | null;
  obvTrend: string | null;
  signalLabel: string | null;
  signalScore: number | null;
  emaCrossSignal: string | null;
  smaCrossSignal: string | null;
  bbUpper: number | null;
  bbLower: number | null;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  pivotR1: number | null;
  pivotS1: number | null;
}

// ─── Bold text helper (converts **text** to <strong>) ──────────

function B({ text }: { text: string }) {
  // Split by ** markers and render alternating plain/bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-extrabold text-text-primary">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Narrative generator helpers ────────────────────────────────

function getIndonesianDate(): string {
  const now = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function pct(v: number): string {
  return `${Math.abs(v).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function triliun(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)} triliun`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} miliar`;
  return `${(v / 1e6).toFixed(0)} juta`;
}

type NarrativeParts = {
  p1Segments: ReactNode[];
  p2Segments: ReactNode[];
  investorSegments: ReactNode[];
  traderSegments: ReactNode[];
  mood: "bullish" | "bearish" | "mixed" | "neutral";
};

function generateNarrative(props: DailyAnalysisSectionProps): NarrativeParts {
  const {
    close, changePercent, volume, rsi14, macdHist,
    sma20, sma50, sma200, adx, stochK, supertrend, atr, obvTrend,
    signalLabel, bbUpper, bbLower, pe, dividendYield,
    marketCap, week52High, week52Low, pivotR1, pivotS1, stockName, ticker,
  } = props;

  const cleanTicker = stripJk(ticker);
  const isUp = changePercent !== null && changePercent > 0;
  const isDown = changePercent !== null && changePercent < 0;
  const isFlat = changePercent !== null && Math.abs(changePercent) < 0.3;
  const bigMove = changePercent !== null && Math.abs(changePercent) > 3;
  const isOverbought = rsi14 !== null && rsi14 > 70;
  const isOversold = rsi14 !== null && rsi14 < 30;
  const isBullishSignal = signalLabel?.toLowerCase().includes("bullish") ?? false;
  const isBearishSignal = signalLabel?.toLowerCase().includes("bearish") ?? false;

  // ─── Paragraph 1: What happened today ──────────────────────
  const p1: ReactNode[] = [];

  p1.push(<span key="0">{stockName} ({cleanTicker}) ditutup di </span>);
  p1.push(<strong key="1" className="font-extrabold text-text-primary">{close ? formatPrice(close) : "-"}</strong>);

  if (isFlat) {
    p1.push(<span key="2">, hampir tidak bergerak ({changePercent !== null ? (changePercent >= 0 ? "+" : "") + pct(changePercent) : "flat"}).</span>);
  } else if (isUp) {
    p1.push(<span key="2">, </span>);
    p1.push(<strong key="3" className="font-extrabold text-bullish">naik {changePercent !== null ? pct(changePercent) : ""}</strong>);
    if (bigMove) p1.push(<span key="4"> dalam pergerakan yang agresif</span>);
    p1.push(<span key="5">.</span>);
  } else if (isDown) {
    p1.push(<span key="2">, </span>);
    p1.push(<strong key="3" className="font-extrabold text-bearish">turun {changePercent !== null ? pct(changePercent) : ""}</strong>);
    if (bigMove) p1.push(<span key="4"> di bawah tekanan jual yang besar</span>);
    p1.push(<span key="5">.</span>);
  }

  if (week52High && close) {
    const distFromHigh = ((week52High - close) / week52High) * 100;
    if (distFromHigh < 3) {
      p1.push(<span key="52h"> Harga saat ini berada sangat dekat dengan harga tertinggi 52 minggu di {formatPrice(week52High)}.</span>);
    } else if (distFromHigh > 30) {
      p1.push(<span key="52h"> Masih jauh dari puncak 52 minggu di {formatPrice(week52High)} — tertinggal {distFromHigh.toFixed(0)}%.</span>);
    }
  }

  if (volume && volume > 0) {
    if (volume > 50_000_000) {
      p1.push(<span key="vol"> Volume perdagangan sangat tinggi, menunjukkan partisipasi besar dari pemain institusi.</span>);
    } else if (volume < 5_000_000) {
      p1.push(<span key="vol"> Volume cenderung tipis, menandakan minat pasar masih terbatas.</span>);
    }
  }

  // ─── Paragraph 2: Technical picture ────────────────────────
  const p2: ReactNode[] = [];
  let segIdx = 0;

  if (isOverbought) {
    p2.push(<span key={segIdx++}>RSI sudah memasuki zona <strong className="font-extrabold text-red-600">overbought</strong> ({rsi14!.toFixed(0)}) — artinya tekanan beli sudah sangat dominan dan potensi koreksi mulai mengintai. </span>);
  } else if (isOversold) {
    p2.push(<span key={segIdx++}>RSI berada di zona <strong className="font-extrabold text-bullish">oversold</strong> ({rsi14!.toFixed(0)}) — penjual sudah terlalu mendominasi, potensi rebound teknikal mulai terbuka. </span>);
  } else if (rsi14 !== null) {
    p2.push(<span key={segIdx++}>RSI di level {rsi14.toFixed(0)}, masih di area netral. </span>);
  }

  if (macdHist !== null) {
    if (macdHist > 0) {
      p2.push(<span key={segIdx++}>MACD menunjukkan momentum <strong className="font-extrabold text-bullish">naik</strong> (histogram positif), mengkonfirmasi tekanan beli masih ada. </span>);
    } else {
      p2.push(<span key={segIdx++}>MACD menunjukkan momentum <strong className="font-extrabold text-bearish">melemah</strong> (histogram negatif), seller masih menguasai pergerakan. </span>);
    }
  }

  const aboveSma: string[] = [];
  const belowSma: string[] = [];
  if (close && sma20) { close > sma20 ? aboveSma.push("SMA20") : belowSma.push("SMA20"); }
  if (close && sma50) { close > sma50 ? aboveSma.push("SMA50") : belowSma.push("SMA50"); }
  if (close && sma200) { close > sma200 ? aboveSma.push("SMA200") : belowSma.push("SMA200"); }

  if (aboveSma.length === 3) {
    p2.push(<span key={segIdx++}>Harga berada <strong className="font-extrabold text-bullish">di atas semua garis rata-rata</strong> (SMA 20, 50, 200) — tren besar masih bullish. </span>);
  } else if (belowSma.length === 3) {
    p2.push(<span key={segIdx++}>Harga <strong className="font-extrabold text-bearish">terjebak di bawah semua garis rata-rata</strong> (SMA 20, 50, 200) — tren besar masih bearish. </span>);
  } else if (aboveSma.length > 0 && belowSma.length > 0) {
    p2.push(<span key={segIdx++}>Harga di atas {aboveSma.join(" & ")} tapi di bawah {belowSma.join(" & ")} — tren masih <strong className="font-extrabold text-amber-600">tidak konsisten</strong>. </span>);
  }

  if (close && supertrend) {
    if (close > supertrend) {
      p2.push(<span key={segIdx++}>Supertrend juga masih hijau, mengkonfirmasi tren naik masih berlanjut. </span>);
    } else {
      p2.push(<span key={segIdx++}>Supertrend berwarna merah, sinyal bahwa penurunan belum selesai. </span>);
    }
  }

  if (adx !== null) {
    if (adx > 40) {
      p2.push(<span key={segIdx++}>ADX di {adx.toFixed(0)} menunjukkan tren yang <strong className="font-extrabold">sangat kuat</strong> — pergerakan saat ini punya backing yang solid. </span>);
    } else if (adx > 25) {
      p2.push(<span key={segIdx++}>ADX di {adx.toFixed(0)} menandakan tren cukup kuat untuk diikuti. </span>);
    } else {
      p2.push(<span key={segIdx++}>ADX hanya {adx.toFixed(0)} — tren masih lemah, pasar sedang ragu-ragu. </span>);
    }
  }

  if (obvTrend === "up") {
    p2.push(<span key={segIdx++}>Volume terakumulasi naik (OBV), uang besar masih masuk. </span>);
  } else if (obvTrend === "down") {
    p2.push(<span key={segIdx++}>OBV menurun — ada indikasi distribusi, uang besar sedang keluar. </span>);
  }

  if (stochK !== null) {
    if (stochK > 80) {
      p2.push(<span key={segIdx++}>Stochastic juga di zona overbought, mendukung potensi koreksi. </span>);
    } else if (stochK < 20) {
      p2.push(<span key={segIdx++}>Stochastic di zona oversold, sinyal konfirmasi potensi bounce. </span>);
    }
  }

  // ─── Investor note ────────────────────────────────────────
  const investor: ReactNode[] = [];
  const fundamentalParts: string[] = [];

  if (pe && pe > 0) {
    if (pe < 15) fundamentalParts.push(`P/E ${pe.toFixed(1)}x masih murah`);
    else if (pe < 25) fundamentalParts.push(`P/E ${pe.toFixed(1)}x masih wajar`);
    else if (pe > 50) fundamentalParts.push(`P/E ${pe.toFixed(1)}x cukup mahal`);
    else fundamentalParts.push(`P/E di ${pe.toFixed(1)}x`);
  }

  if (dividendYield && dividendYield > 0) {
    fundamentalParts.push(`dividen ${pct(dividendYield)}`);
  }

  if (fundamentalParts.length > 0) {
    investor.push(<span key="f0">Dari sisi fundamental, {fundamentalParts.join(", ")}</span>);
    if (marketCap) investor.push(<span key="f1"> dengan kapitalisasi pasar {triliun(marketCap)}</span>);
    investor.push(<span key="f2">. </span>);
  }

  if (isBullishSignal && !isOverbought) {
    investor.push(<span key="i1">Tren besar masih mendukung untuk hold atau akumulasi bertahap. </span>);
  } else if (isBearishSignal) {
    investor.push(<span key="i1">Untuk investor jangka panjang, tunggu sinyal stabilisasi dulu sebelum menambah posisi. </span>);
  } else if (isOverbought && isUp) {
    investor.push(<span key="i1">Hati-hati menambah posisi di level ini — tunggu koreksi untuk entry yang lebih baik. </span>);
  } else if (isOversold && isDown) {
    investor.push(<span key="i1">Bagi yang sudah punya, bisa hold. Bagi yang mau masuk, level ini mulai menarik untuk akumulasi perlahan. </span>);
  }

  if (close && sma200) {
    const distFromSma200 = ((close - sma200) / sma200) * 100;
    if (Math.abs(distFromSma200) < 5) {
      investor.push(<span key="i2">Harga berada dekat SMA200 — area krusial yang biasanya jadi titik balik. </span>);
    }
  }

  // ─── Trader note ──────────────────────────────────────────
  const trader: ReactNode[] = [];
  const supportLevel = pivotS1 ?? sma20;
  const resistanceLevel = pivotR1 ?? sma50;

  if (supportLevel && close) {
    trader.push(<span key="t0"><strong className="font-extrabold">Support kunci</strong> di {formatPrice(supportLevel)}</span>);
    if (close < supportLevel * 1.02) {
      trader.push(<span key="t1"> — harga sudah sangat dekat, jika tembus bisa lanjut turun</span>);
    }
    trader.push(<span key="t2">. </span>);
  }

  if (resistanceLevel && close) {
    trader.push(<span key="t3"><strong className="font-extrabold">Resistance terdekat</strong> di {formatPrice(resistanceLevel)}</span>);
    if (close > resistanceLevel * 0.98) {
      trader.push(<span key="t4"> — tinggal selangkah lagi, pantau volume breakout-nya</span>);
    }
    trader.push(<span key="t5">. </span>);
  }

  if (atr && close) {
    const atrPct = (atr / close) * 100;
    if (atrPct > 3) {
      trader.push(<span key="t6">Volatilitas tinggi (ATR {atrPct.toFixed(1)}%) — gunakan stoploss ketat dan posisi kecil. </span>);
    } else if (atrPct < 1) {
      trader.push(<span key="t6">Volatilitas rendah (ATR {atrPct.toFixed(1)}%) — peluang breakout/breakdown sedang menguat. </span>);
    }
  }

  if (isOverbought && isUp && bigMove) {
    trader.push(<span key="t7">Konfirmasi overbought + kenaikan besar + volume tinggi = <strong className="font-extrabold text-bearish">waspada koreksi tajam</strong>. </span>);
  } else if (isOversold && isDown && bigMove) {
    trader.push(<span key="t7">Oversold + penurunan besar = <strong className="font-extrabold text-bullish">watch closely untuk entry bounce</strong>. </span>);
  }

  // ─── Determine mood ───────────────────────────────────────
  let mood: NarrativeParts["mood"] = "neutral";
  if (isBullishSignal && !isOverbought) mood = "bullish";
  else if (isBearishSignal && !isOversold) mood = "bearish";
  else if ((isOverbought && isUp) || (isOversold && isDown)) mood = "mixed";

  return { p1Segments: p1, p2Segments: p2, investorSegments: investor, traderSegments: trader, mood };
}

// ─── Component ──────────────────────────────────────────────────

function moodGradient(mood: NarrativeParts["mood"]): string {
  switch (mood) {
    case "bullish": return "from-teal-500/8 via-transparent to-transparent";
    case "bearish": return "from-red-500/8 via-transparent to-transparent";
    case "mixed": return "from-amber-500/8 via-transparent to-transparent";
    default: return "from-gray-500/5 via-transparent to-transparent";
  }
}

function moodAccent(mood: NarrativeParts["mood"]): string {
  switch (mood) {
    case "bullish": return "#0d9488";
    case "bearish": return "#dc2626";
    case "mixed": return "#f59e0b";
    default: return "#78716c";
  }
}

// ─── Component ──────────────────────────────────────────────────

export default function DailyAnalysisSection(props: DailyAnalysisSectionProps) {
  const { changePercent } = props;
  const narrative = generateNarrative(props);
  const accent = moodAccent(narrative.mood);

  const hasContent = narrative.investorSegments.length > 0 || narrative.traderSegments.length > 0;

  return (
    <div className="relative rounded-2xl border border-border bg-bg-card overflow-hidden">
      {/* Top accent bar */}
      <div className="h-[3px] w-full" style={{ background: accent }} />

      {/* Subtle mood gradient overlay */}
      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${moodGradient(narrative.mood)}`} />

      <div className="relative z-[1] p-6 sm:p-8 space-y-6">
        {/* Header — title + date only, no redundant score/badge */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary leading-tight">
            Analisa Hari Ini
          </h2>
          <p className="text-sm font-semibold text-text-tertiary">
            {getIndonesianDate()}
          </p>
        </div>

        {/* Main narrative */}
        <div className="space-y-5">
          {/* Paragraph 1 — What happened */}
          {narrative.p1Segments.length > 0 && (
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accent }}>
              <p className="text-base sm:text-lg font-semibold text-text-primary leading-relaxed">
                {narrative.p1Segments}
              </p>
            </div>
          )}

          {/* Paragraph 2 — Technical picture */}
          {narrative.p2Segments.length > 0 && (
            <p className="text-sm sm:text-base font-medium text-text-secondary leading-relaxed">
              {narrative.p2Segments}
            </p>
          )}
        </div>

        {/* Investor + Trader split */}
        {hasContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Investor */}
            {narrative.investorSegments.length > 0 && (
              <div className="rounded-xl bg-teal-50/60 border border-teal-200/50 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏦</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-700">
                    Untuk Investor
                  </h4>
                </div>
                <p className="text-sm font-semibold text-teal-900/80 leading-relaxed">
                  {narrative.investorSegments}
                </p>
              </div>
            )}

            {/* Trader */}
            {narrative.traderSegments.length > 0 && (
              <div className="rounded-xl bg-blue-50/60 border border-blue-200/50 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Untuk Trader
                  </h4>
                </div>
                <p className="text-sm font-semibold text-blue-900/80 leading-relaxed">
                  {narrative.traderSegments}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11px] text-text-tertiary leading-relaxed max-w-xl">
            Analisa ini berdasarkan data teknikal & fundamental historis — bukan rekomendasi jual/beli.
            Selalu lakukan riset mandiri sebelum mengambil keputusan investasi.
          </p>
          {changePercent !== null && (
            <span className="text-[10px] font-mono text-text-tertiary shrink-0">
              Data tertunda ~5 mnt
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
