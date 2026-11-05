import { stripJk } from "@/lib/utils";
import { formatDecimalId } from "@/lib/format-number";

export interface IndicatorSeoData {
  rsi14?: number | null;
  macdLine?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
  stochK?: number | null;
  stochD?: number | null;
  adx?: number | null;
  atr?: number | null;
}

export interface IndicatorSeoSectionProps {
  ticker: string;
  name: string;
  close?: number | null;
  indicators?: IndicatorSeoData | null;
}

interface BlockItem {
  id: string;
  heading: string;
  text: string;
}

export function IndicatorSeoSection({
  ticker,
  name,
  close,
  indicators,
}: IndicatorSeoSectionProps) {
  if (!indicators) return null;

  const clean = stripJk(ticker);
  const blocks: BlockItem[] = [];

  // 1. RSI (coverage >80%)
  if (indicators.rsi14 != null) {
    const val = indicators.rsi14;
    const str = formatDecimalId(val, 2);
    let desc = "";
    if (val < 30) {
      desc = `Relative Strength Index (RSI 14) saham ${clean} hari ini berada di level ${str}. Angka ini menunjukkan saham ${name} sedang berada di area jenuh jual (oversold). Secara teknikal, kondisi ini membuka peluang terjadinya technical rebound jika tekanan jual mereda.`;
    } else if (val > 70) {
      desc = `Relative Strength Index (RSI 14) saham ${clean} hari ini berada di level ${str}. Angka ini menempatkan saham ${name} di area jenuh beli (overbought). Kondisi ini mengindikasikan reli harga sudah cukup tinggi dan rawan mengalami aksi ambil untung atau koreksi jangka pendek.`;
    } else {
      desc = `Relative Strength Index (RSI 14) saham ${clean} hari ini berada di level ${str}. Posisi ini mencerminkan momentum pergerakan saham ${name} yang berada di rentang netral (30–70). Pasar saat ini bergerak seimbang tanpa indikasi tekanan beli atau jual yang berlebihan.`;
    }
    blocks.push({ id: "rsi", heading: `RSI ${clean} Hari Ini`, text: desc });
  }

  // 2. MACD (coverage >80%)
  if (indicators.macdLine != null && indicators.macdSignal != null) {
    const macdStr = formatDecimalId(indicators.macdLine, 2);
    const sigStr = formatDecimalId(indicators.macdSignal, 2);
    const isBull = indicators.macdLine > indicators.macdSignal;
    const desc = isBull
      ? `Indikator MACD saham ${clean} mencatatkan garis MACD di level ${macdStr}, berada di atas garis sinyal di level ${sigStr}. Posisi persilangan positif ini mengindikasikan momentum tren saham ${name} dalam fase menguat (bullish). Kekuatan pembeli masih dominan dalam mengawal arah pergerakan harga saat ini.`
      : `Indikator MACD saham ${clean} menunjukkan garis MACD di level ${macdStr}, bergerak di bawah garis sinyal di level ${sigStr}. Formasi ini mengindikasikan momentum pergerakan saham ${name} masih berada dalam tekanan pelemahan (bearish). Pelaku pasar disarankan mencermati konfirmasi pembalikan arah sebelum meningkatkan eksposur.`;
    blocks.push({ id: "macd", heading: `MACD ${clean} Hari Ini`, text: desc });
  }

  // 3. Moving Average (coverage >80%)
  if (indicators.sma20 != null || indicators.sma50 != null) {
    const sma20Str = formatDecimalId(indicators.sma20, 2);
    const sma50Str = formatDecimalId(indicators.sma50, 2);
    let desc = "";
    if (close != null && indicators.sma20 != null && indicators.sma50 != null) {
      if (close >= indicators.sma20 && indicators.sma20 >= indicators.sma50) {
        desc = `Rata-rata pergerakan saham ${clean} mencatatkan SMA 20 di level ${sma20Str} dan SMA 50 di level ${sma50Str}. Harga penutupan terakhir bergerak di atas kedua garis rata-rata tersebut, mengonfirmasi tren jangka pendek dan menengah saham ${name} dalam kondisi uptrend. Area SMA 20 berfungsi sebagai level support dinamis terdekat.`;
      } else if (close < indicators.sma20 && indicators.sma20 < indicators.sma50) {
        desc = `Rata-rata pergerakan saham ${clean} berada di level SMA 20 ${sma20Str} dan SMA 50 ${sma50Str}. Harga saham ${name} saat ini tertahan di bawah kedua garis rata-rata bergerak, menandakan tren pergerakan masih dalam fase koreksi (downtrend). Pembalikan tren memerlukan dorongan volume untuk menembus kembali garis resistansi SMA 20.`;
      } else {
        desc = `Garis rata-rata pergerakan saham ${clean} mencatat level SMA 20 di ${sma20Str} dan SMA 50 di ${sma50Str}. Posisi harga saham ${name} yang berada di antara kedua garis ini mencerminkan fase konsolidasi atau transisi tren pergerakan. Pelaku pasar dapat mengantisipasi arah penembusan berikutnya sebagai sinyal konfirmasi tren.`;
      }
    } else {
      desc = `Indikator moving average saham ${clean} mencatat SMA 20 di level ${sma20Str || "-"} dan SMA 50 di ${sma50Str || "-"}. Posisi garis rata-rata ini menjadi acuan dasar dalam membaca struktur tren harga saham ${name}. Level ini dapat digunakan sebagai panduan support dan resistansi pergerakan reguler.`;
    }
    blocks.push({ id: "sma", heading: `Moving Average ${clean} Hari Ini`, text: desc });
  }

  // 4. Bollinger Bands (coverage >80%)
  if (indicators.bbUpper != null && indicators.bbLower != null) {
    const upStr = formatDecimalId(indicators.bbUpper, 2);
    const midStr = formatDecimalId(indicators.bbMiddle, 2);
    const lowStr = formatDecimalId(indicators.bbLower, 2);
    let desc = "";
    if (close != null && close >= indicators.bbUpper) {
      desc = `Pita Bollinger Bands saham ${clean} mencatatkan batas atas di level ${upStr} dan batas bawah di level ${lowStr}. Harga penutupan saham ${name} saat ini menguji pita atas, mengindikasikan volatilitas tinggi dan dorongan beli agresif. Namun, posisi dekat pita atas juga meningkatkan potensi konsolidasi menuju garis tengah di level ${midStr}.`;
    } else if (close != null && close <= indicators.bbLower) {
      desc = `Indikator Bollinger Bands saham ${clean} menunjukkan batas atas di ${upStr} dan batas bawah di ${lowStr}. Harga saham ${name} menyentuh atau berada di dekat pita bawah, merefleksikan tekanan jual yang intensif. Kondisi ini sering kali menarik minat beli spekulatif jika harga mulai membentuk dasar pantulan di atas pita bawah.`;
    } else {
      desc = `Indikator Bollinger Bands saham ${clean} memiliki batas atas di level ${upStr}, batas tengah di ${midStr}, dan batas bawah di ${lowStr}. Fluktuasi harga saham ${name} masih berada di dalam koridor rentang normal tanpa deviasi ekstrem. Rentang ini memberikan batas acuan volatilitas dan estimasi pergerakan harga harian.`;
    }
    blocks.push({ id: "bb", heading: `Bollinger Bands ${clean} Hari Ini`, text: desc });
  }

  // 5. Stochastic (coverage >80%)
  if (indicators.stochK != null && indicators.stochD != null) {
    const kStr = formatDecimalId(indicators.stochK, 2);
    const dStr = formatDecimalId(indicators.stochD, 2);
    let desc = "";
    if (indicators.stochK < 20 && indicators.stochD < 20) {
      desc = `Osilator Stokastik saham ${clean} mencatat nilai %K di level ${kStr} dan %D di level ${dStr}. Angka di bawah 20 menempatkan pergerakan saham ${name} pada area oversold (jenuh jual). Persilangan ke atas antara garis %K dan %D di area ini dapat menjadi sinyal awal terjadinya pembalikan arah jangka pendek.`;
    } else if (indicators.stochK > 80 && indicators.stochD > 80) {
      desc = `Osilator Stokastik saham ${clean} mencatat nilai %K di level ${kStr} dan %D di level ${dStr}. Angka di atas 80 mengindikasikan kondisi overbought (jenuh beli) pada saham ${name}. Momentum beli yang mulai terbatas memerlukan kehati-hatian terhadap potensi koreksi jangka pendek.`;
    } else {
      desc = `Osilator Stokastik saham ${clean} hari ini mencatat level %K sebesar ${kStr} dan %D sebesar ${dStr}. Nilai ini menempatkan momentum saham ${name} pada area netral tanpa kejenuhan ekstrem. Pergerakan harga diperkirakan masih berfluktuasi secara wajar mengikuti aktivitas perdagangan harian.`;
    }
    blocks.push({ id: "stoch", heading: `Stochastic ${clean} Hari Ini`, text: desc });
  }

  // 6. ADX (coverage >80%)
  if (indicators.adx != null) {
    const adxStr = formatDecimalId(indicators.adx, 2);
    const desc = indicators.adx >= 25
      ? `Indikator Average Directional Index (ADX) saham ${clean} hari ini berada di level ${adxStr}. Angka di atas 25 mengonfirmasi bahwa saham ${name} sedang berada dalam tren pergerakan yang kuat dan terarah. Kekuatan tren ini mendukung kelanjutan pola pergerakan harga yang sedang berlangsung di pasar.`
      : `Indikator Average Directional Index (ADX) saham ${clean} hari ini berada di level ${adxStr}. Nilai di bawah 25 menunjukkan bahwa saham ${name} belum membentuk tren yang kuat atau sedang dalam fase konsolidasi menyamping (sideways). Pelaku pasar disarankan menunggu konfirmasi arah tren yang lebih tegas sebelum mengambil posisi agresif.`;
    blocks.push({ id: "adx", heading: `ADX ${clean} Hari Ini`, text: desc });
  }

  // 7. ATR (coverage >80%)
  if (indicators.atr != null) {
    const atrStr = formatDecimalId(indicators.atr, 2);
    const desc = `Nilai Average True Range (ATR 14) saham ${clean} hari ini tercatat sebesar ${atrStr}. Angka ini mengukur rata-rata rentang volatilitas pergerakan harga harian saham ${name}. Trader dapat memanfaatkan nilai ATR ini sebagai acuan perhitungan risiko serta penentuan jarak trailing stop loss yang realistis.`;
    blocks.push({ id: "atr", heading: `ATR ${clean} Hari Ini`, text: desc });
  }

  if (blocks.length === 0) return null;

  return (
    <section aria-label={`Analisa Indikator ${clean}`} className="bg-bg-card rounded-xl border border-border p-5 depth-shadow">
      <details className="group">
        <summary className="cursor-pointer list-none flex items-center justify-between text-sm sm:text-base font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
          <span>📖 Baca Penjelasan Lengkap Indikator {clean} (RSI, MACD, dll)</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-tertiary transition-transform duration-200 group-open:rotate-180 shrink-0 ml-2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="space-y-4 mt-4 pt-4 border-t border-border">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="bg-bg-hover/50 rounded-lg p-4 border border-border/50"
            >
              <h2 className="text-base font-semibold text-text-primary mb-2">
                {block.heading}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {block.text}
              </p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
