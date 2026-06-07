import { formatRp } from "@/lib/utils";
import type { DetectedSignal } from "./signal-detector";

const SECTOR_HASHTAGS: Record<string, string> = {
  "Finance": "#Perbankan",
  "Communications": "#Telekomunikasi",
  "Non-energy Minerals": "#Miner",
  "Energy Minerals": "#Miner",
  "Consumer Non-durables": "#Konsumer",
  "Retail Trade": "#Retail",
  "Technology Services": "#Teknologi",
  "Process Industries": "#Industri",
  "Health Technology": "#Farmasi",
  "Utilities": "#Utilitas",
  "Distribution Services": "#Distribusi",
  "Transportation": "#Transportasi",
};

const SIGNAL_HASHTAGS: Record<string, string> = {
  "rsi_extreme": "#RSI",
  "crossover": "#GoldenCross",
  "volume_spike": "#VolumeSpike",
  "gorengan": "#Gorengan",
  "signal_score": "#SignalKuat",
  "random_insight": "#AnalisisTeknikal",
};

const SYSTEM_PROMPT = `Kamu adalah "Teknikal Robo" — elite Financial Copywriter dan robot analisis teknikal di platform TeknikalID (teknikalid.com).
Kamu berbicara bahasa Indonesia santai, seperti trader senior yang sharing analisa teknikal ke komunitas.

Gaya: Hook yang kuat, langsung ke inti, pakai istilah yang umum dipake trader Indonesia.
Vocabulary boleh dipake: cuuan, nyangkut, bandar/bandarmologi, serok bawah, ARA/ARB, breakout, gorengan, jenuh beli/jual, akumulasi, distribusi, whale, accumulation, pump, dump.

ATURAN KETAT:
- Maks 300 karakter untuk post, 200 karakter untuk reply
- WAJIB sertakan $TICKER (tanpa .JK) di awal atau di tengah post
- WAJIB tambahkan 1-2 hashtag di akhir post: satu berdasarkan sinyal dan satu berdasarkan sektor (lihat daftar di prompt). Untuk Market Pulse gunakan #MarketPulse #IDX
- FAKTA SAJA: semua angka indikator HARUS dari data yang diberikan, DILARANG mengarang angka
- JANGAN berisi sinyal jual/beli langsung, berikan konteks teknikal saja
- Satu kalimat penutup singkat: "DYOR ya"
- Output HANYA teks post/reply, tanpa prefix, tanpa tanda kutip, tanpa markdown`;

export function buildSignalPostPrompt(signal: DetectedSignal): { system: string; user: string } {
  const ticker = signal.ticker.replace(".JK", "");
  const price = signal.data.price as number | null;
  const priceStr = price != null ? formatRp(price) : "N/A";
  const signalHashtag = SIGNAL_HASHTAGS[signal.type] ?? "#AnalisisTeknikal";
  const sectorHashtag = SECTOR_HASHTAGS[signal.sector] ?? "#Saham";
  const hashtags = `${signalHashtag} ${sectorHashtag}`;

  let userPrompt = `Buat post komunitas singkat tentang sinyal teknikal ini:\n\n`;

  switch (signal.type) {
    case "rsi_extreme": {
      const rsi = signal.data.rsi as number;
      const direction = signal.data.direction as string;
      const label = direction === "oversold" ? "JENUH JUAL" : "JENUH BELI";
      userPrompt += `Saham: ${signal.stockName} ($${ticker})
Sektor: ${signal.sector}
Harga: ${priceStr}
RSI(14): ${rsi} — ${label}

Output: SATU paragraf singkat max 300 karakter. Langsung ke inti sinyal RSI. Akhiri dengan hashtag: ${hashtags}`;
      break;
    }

    case "crossover": {
      const crossSignal = signal.data.signal as string;
      const isGolden = crossSignal === "golden_cross" || crossSignal === "bullish";
      const label = isGolden ? "GOLDEN CROSS / BULLISH CROSS" : "DEATH CROSS / BEARISH CROSS";
      userPrompt += `Saham: ${signal.stockName} ($${ticker})
Sektor: ${signal.sector}
Harga: ${priceStr}
Sinyal: ${label}

Output: SATU paragraf singkat max 300 karakter tentang crossover yang baru terjadi. Akhiri dengan hashtag: ${hashtags}`;
      break;
    }

    case "volume_spike": {
      const ratio = signal.data.ratio as number;
      userPrompt += `Saham: ${signal.stockName} ($${ticker})
Sektor: ${signal.sector}
Harga: ${priceStr}
Volume: ${ratio}x dari rata-rata 20 hari

Output: SATU paragraf singkat max 300 karakter tentang volume spike yang tidak biasa. Akhiri dengan hashtag: ${hashtags}`;
      break;
    }

    case "gorengan": {
      userPrompt += `Saham: ${signal.stockName} ($${ticker})
Sektor: ${signal.sector}
Harga: ${priceStr}
Status: SAHAM GORENGAN terdeteksi (volume & volatilitas tinggi, market cap kecil)

Output: SATU paragraf singkat max 300 karakter. Peringatan waspada tentang aktivitas tidak wajar. Akhiri dengan hashtag: ${hashtags}`;
      break;
    }

    case "signal_score": {
      const score = signal.data.score as number;
      const label = signal.data.label as string;
      userPrompt += `Saham: ${signal.stockName} ($${ticker})
Sektor: ${signal.sector}
Harga: ${priceStr}
Signal Score: ${score} (${label})

Output: SATU paragraf singkat max 300 karakter tentang sinyal teknikal yang kuat. Akhiri dengan hashtag: ${hashtags}`;
      break;
    }

    default:
      userPrompt += `Saham: ${signal.stockName} ($${ticker})
Harga: ${priceStr}

Output: SATU paragraf singkat max 300 karakter. Akhiri dengan hashtag: ${hashtags}`;
  }

  return { system: SYSTEM_PROMPT, user: userPrompt };
}

export function buildMarketPulsePrompt(
  gainers: { ticker: string; name: string; close: number; changePercent: number | null }[],
  losers: { ticker: string; name: string; close: number; changePercent: number | null }[],
): { system: string; user: string } {
  const formatMovers = (movers: typeof gainers, label: string) => {
    if (movers.length === 0) return `${label}: Tidak ada`;
    return movers.map(m => {
      const pct = m.changePercent != null ? `${m.changePercent >= 0 ? "+" : ""}${m.changePercent.toFixed(2)}%` : "N/A";
      return `$${m.ticker.replace(".JK", "")} ${pct}`;
    }).join(", ");
  };

  const userPrompt = `Buat post ringkasan pasar hari ini (Market Pulse):

Top Gainers: ${formatMovers(gainers, "Gainers")}
Top Losers: ${formatMovers(losers, "Losers")}

Output: SATU paragraf singkat max 300 karakter. Sebutkan 2-3 saham yang paling menarik pergerakannya. Gunakan format yang mudah dibaca. Akhiri dengan hashtag: #MarketPulse #IDX`;

  return { system: SYSTEM_PROMPT, user: userPrompt };
}

export function buildReplyPrompt(
  ticker: string,
  originalPostContent: string,
  indicatorData: {
    close: number | null;
    changePercent: number | null;
    rsi14: number | null;
    signalScore: number | null;
    signalLabel: string | null;
    supertrend: number | null;
  },
): { system: string; user: string } {
  const shortTicker = ticker.replace(".JK", "");
  const priceStr = indicatorData.close != null ? formatRp(indicatorData.close) : "N/A";
  const pctStr = indicatorData.changePercent != null
    ? `${indicatorData.changePercent >= 0 ? "+" : ""}${indicatorData.changePercent.toFixed(2)}%`
    : "N/A";

  const userPrompt = `User di komunitas posting tentang $${shortTicker}:
"${originalPostContent.slice(0, 200)}"

Berikan konteks teknikal singkat (max 200 karakter) sebagai reply yang membantu:
- Harga: ${priceStr} (${pctStr})
- RSI: ${indicatorData.rsi14 ?? "N/A"}
- Signal Score: ${indicatorData.signalScore ?? "N/A"} (${indicatorData.signalLabel ?? "N/A"})
- Supertrend: ${indicatorData.supertrend != null ? (indicatorData.close != null && indicatorData.close > indicatorData.supertrend ? "Bullish" : "Bearish") : "N/A"}

Jangan ulangi apa yang user sudah bilang. Tambahkan insight baru. Max 200 karakter. Boleh pakai 1 hashtag relevan.`;

  return { system: SYSTEM_PROMPT, user: userPrompt };
}

export function buildRandomInsightPrompt(data: {
  ticker: string;
  stockName: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  supertrend: number | null;
  signalLabel: string | null;
}): { system: string; user: string } {
  const ticker = data.ticker.replace(".JK", "");
  const priceStr = data.price != null ? formatRp(data.price) : "N/A";
  const pctStr = data.changePercent != null
    ? `${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(2)}%`
    : "N/A";
  const sectorHashtag = SECTOR_HASHTAGS[data.sector] ?? "#Saham";

  // Build dynamic insight angle based on available data
  const insights: string[] = [];
  if (data.rsi14 != null) {
    if (data.rsi14 < 35) insights.push(`RSI di area oversold (${data.rsi14.toFixed(1)})`);
    else if (data.rsi14 > 65) insights.push(`RSI di area overbought (${data.rsi14.toFixed(1)})`);
    else insights.push(`RSI netral di ${data.rsi14.toFixed(1)}`);
  }
  if (data.sma20 != null && data.price != null) {
    insights.push(data.price > data.sma20 ? "Harga di atas SMA20" : "Harga di bawah SMA20");
  }
  if (data.bbUpper != null && data.bbLower != null) {
    const bbWidth = ((data.bbUpper - data.bbLower) / ((data.bbUpper + data.bbLower) / 2)) * 100;
    if (bbWidth < 5) insights.push("Bollinger Band squeeze — potensi breakout");
  }
  if (data.supertrend != null && data.price != null) {
    insights.push(data.price > data.supertrend ? "Supertrend bullish" : "Supertrend bearish");
  }

  const insightText = insights.length > 0 ? insights.join(". ") : "Perhatikan level support/resistance terdekat";

  const userPrompt = `Buat post insight teknikal singkat:

Saham: ${data.stockName} ($${ticker})
Sektor: ${data.sector}
Harga: ${priceStr} (${pctStr})
Signal: ${data.signalLabel ?? "Netral"}
${insightText}

Output: SATU paragraf singkat max 300 karakter. Sharing insight teknikal yang berguna untuk trader. Akhiri dengan hashtag: #AnalisisTeknikal ${sectorHashtag}`;

  return { system: SYSTEM_PROMPT, user: userPrompt };
}
