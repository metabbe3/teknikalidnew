import {
  translateRSI,
  translateMACD,
  translateStochastic,
  translateSMA,
  translateADX,
  translateSupertrend,
  translateOBV,
  translateBB,
  translateCrossSignal,
} from "@/lib/indicator-translations";

interface TemplateData {
  ticker: string;
  name: string;
  sector: string;
  close: number | null;
  changePercent: number | null;
  rsi14: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  atr: number | null;
  supertrend: number | null;
  obvTrend: string | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;

  // Signal & classification (optional for buildTemplateArticle)
  signalScore?: number | null;
  signalLabel?: string | null;
  isGorengan?: boolean;

  // Fundamentals
  pe?: number | null;
  forwardPe?: number | null;
  pb?: number | null;
  eps?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;

  // Extra price context
  prevClose?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;

  // Crossover signals
  smaCrossSignal?: string | null;
  emaCrossSignal?: string | null;
}

type Outlook = "BULLISH" | "BEARISH" | "NETRAL";

function determineOutlook(d: TemplateData): Outlook {
  const signals: ("bullish" | "bearish" | "neutral")[] = [];
  if (d.rsi14 !== null) signals.push(d.rsi14 < 35 ? "bullish" : d.rsi14 > 65 ? "bearish" : "neutral");
  if (d.macdHist !== null) signals.push(d.macdHist > 0 ? "bullish" : "bearish");
  if (d.close !== null && d.sma50 !== null) signals.push(d.close > d.sma50 ? "bullish" : "bearish");
  if (d.close !== null && d.sma200 !== null) signals.push(d.close > d.sma200 ? "bullish" : "bearish");
  if (d.adx !== null && d.adx > 25 && d.close !== null && d.supertrend !== null) {
    signals.push(d.close > d.supertrend ? "bullish" : "bearish");
  }

  const bullish = signals.filter((s) => s === "bullish").length;
  const bearish = signals.filter((s) => s === "bearish").length;
  if (bullish > bearish + 1) return "BULLISH";
  if (bearish > bullish + 1) return "BEARISH";
  return "NETRAL";
}

function fmt(val: number | null, decimals = 0): string {
  if (val === null) return "N/A";
  return val.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function price(val: number | null): string {
  if (val === null) return "N/A";
  return `Rp ${fmt(val)}`;
}

function pct(val: number | null): string {
  if (val === null) return "N/A";
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

function rsiLabel(rsi: number | null): string {
  if (rsi === null) return "N/A";
  if (rsi < 30) return "Oversold — potensi rebound";
  if (rsi > 70) return "Overbought — potensi koreksi";
  if (rsi < 40) return "Mendekati oversold, waspadai pembalikan";
  if (rsi > 60) return "Mendekati overbought, waspadai koreksi";
  return "Area normal";
}

function macdLabel(macdHist: number | null): string {
  if (macdHist === null) return "N/A";
  return macdHist > 0 ? "Bullish (di atas zero line)" : "Bearish (di bawah zero line)";
}

function adxLabel(adx: number | null): string {
  if (adx === null) return "N/A";
  if (adx > 50) return "Tren sangat kuat";
  if (adx > 25) return "Tren aktif";
  if (adx > 20) return "Tren mulai terbentuk";
  return "Sideways — belum ada tren jelas";
}

function stochLabel(k: number | null, d: number | null): string {
  if (k === null || d === null) return "N/A";
  if (k < 20 && d < 20) return "Oversold — sinyal beli potensial";
  if (k > 80 && d > 80) return "Overbought — sinyal jual potensial";
  if (k > d) return "Momentum bullish (%K di atas %D)";
  return "Momentum bearish (%K di bawah %D)";
}

function trendLabel(close: number | null, sma200: number | null): string {
  if (close === null || sma200 === null) return "Data tidak tersedia";
  if (close > sma200 * 1.05) return "di atas tren jangka panjang (SMA200) — tren naik kuat";
  if (close > sma200) return "di atas tren jangka panjang (SMA200)";
  if (close < sma200 * 0.95) return "di bawah tren jangka panjang (SMA200) — tren turun kuat";
  return "di bawah tren jangka panjang (SMA200)";
}

function atrLabel(atr: number | null, close: number | null): string {
  if (atr === null || close === null || close === 0) return "N/A";
  const ratio = (atr / close) * 100;
  if (ratio > 4) return "Tinggi — pergerakan harga sangat fluktuatif";
  if (ratio > 2.5) return "Moderat — pergerakan cukup aktif";
  return "Rendah — pergerakan harga relatif stabil";
}

// ── New helpers for daily snapshot ──

function signalLabelToId(label: string | null): string {
  if (!label) return "NETRAL";
  const map: Record<string, string> = {
    "Strong Bullish": "BULLISH KUAT",
    "Bullish": "BULLISH",
    "Netral": "NETRAL",
    "Bearish": "BEARISH",
    "Strong Bearish": "BEARISH KUAT",
  };
  return map[label] ?? "NETRAL";
}

function formatVolumeHuman(vol: number | null): string {
  if (vol === null) return "N/A";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)} miliar lot`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)} juta lot`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)} ribu lot`;
  return `${vol} lot`;
}

function formatMarketCapHuman(mc: number | null): string {
  if (mc === null) return "N/A";
  if (mc >= 1e12) return `Rp ${(mc / 1e12).toFixed(1)} Triliun`;
  if (mc >= 1e9) return `Rp ${(mc / 1e9).toFixed(1)} Miliar`;
  return `Rp ${mc.toLocaleString("id-ID")}`;
}

function bbPosition(close: number, upper: number, lower: number): number {
  if (upper === lower) return 50;
  return Math.max(0, Math.min(100, ((close - lower) / (upper - lower)) * 100));
}

function buildChecklist(d: TemplateData): string {
  const t = d.ticker.replace(".JK", "");
  const lines: string[] = [];

  const rsi = translateRSI(d.rsi14);
  lines.push(`- **RSI (14)**: ${d.rsi14 !== null ? d.rsi14.toFixed(1) : "N/A"} — ${rsi.short}`);

  const macd = translateMACD(d.macdHist);
  lines.push(`- **MACD**: ${macd.short}${d.macdHist !== null ? ` (histogram ${d.macdHist > 0 ? "positif" : "negatif"})` : ""}`);

  const sma = translateSMA(d.sma20, d.sma50, d.sma200, d.close);
  lines.push(`- **SMA 20/50/200**: ${sma.short}`);

  const stoch = translateStochastic(d.stochK, d.stochD);
  lines.push(`- **Stochastic**: ${stoch.short}${d.stochK !== null && d.stochD !== null ? ` (K: ${d.stochK.toFixed(1)} / D: ${d.stochD.toFixed(1)})` : ""}`);

  const adx = translateADX(d.adx);
  lines.push(`- **ADX**: ${d.adx !== null ? d.adx.toFixed(1) : "N/A"} — ${adx.short}`);

  const st = translateSupertrend(d.close, d.supertrend);
  lines.push(`- **Supertrend**: ${st.short}`);

  const bbPos = d.close !== null && d.bbUpper !== null && d.bbLower !== null
    ? bbPosition(d.close, d.bbUpper, d.bbLower) : null;
  const bb = translateBB(bbPos);
  lines.push(`- **Bollinger Bands**: ${bb.short}`);

  const obv = translateOBV(d.obvTrend);
  lines.push(`- **OBV**: ${obv.short} — ${obv.explanation}`);

  // Cross signals if present
  if (d.smaCrossSignal) {
    const cross = translateCrossSignal(d.smaCrossSignal, "sma");
    lines.push(`- **SMA Cross**: ${cross.short}`);
  }
  if (d.emaCrossSignal) {
    const cross = translateCrossSignal(d.emaCrossSignal, "ema");
    lines.push(`- **EMA Cross**: ${cross.short}`);
  }

  return `:::checklist[Sinyal Teknikal ${t} Hari Ini]\n${lines.join("\n")}\n:::`;
}

function buildFundamentalSection(d: TemplateData): string {
  if (!d.pe && !d.eps && !d.dividendYield && !d.marketCap) {
    return "";
  }
  const t = d.ticker.replace(".JK", "");
  let out = `## Fundamental ${t}\n\n| Metrik | Nilai |\n|--------|-------|\n`;
  if (typeof d.pe === "number") out += `| P/E Ratio | ${d.pe.toFixed(1)}x |\n`;
  if (typeof d.forwardPe === "number") out += `| Forward P/E | ${d.forwardPe.toFixed(1)}x |\n`;
  if (typeof d.pb === "number") out += `| Price/Book | ${d.pb.toFixed(2)}x |\n`;
  if (typeof d.eps === "number") out += `| EPS | ${price(d.eps)} |\n`;
  if (typeof d.dividendYield === "number") out += `| Dividen Yield | ${d.dividendYield.toFixed(2)}% |\n`;
  if (typeof d.marketCap === "number") out += `| Market Cap | ${formatMarketCapHuman(d.marketCap)} |\n`;
  return out;
}

function outlookNarrative(d: TemplateData, support: number | null, resistance: number | null): string {
  const score = d.signalScore ?? null;
  const isBullish = score !== null && score > 0.2;
  const isBearish = score !== null && score < -0.2;

  if (isBullish) {
    let text = `${d.name} menunjukkan momentum positif dengan konfirmasi dari beberapa indikator teknikal.`;
    if (d.close !== null && d.sma50 !== null && d.close > d.sma50) {
      text += ` Harga masih berada di atas SMA50 (${price(d.sma50)}), mengkonfirmasi tren naik.`;
    }
    if (resistance !== null) {
      text += ` Perhatikan resistance di ${price(resistance)} — jika tembus, potensi lanjut ke ${price(d.week52High)} (high 52 minggu).`;
    }
    return text;
  }
  if (isBearish) {
    let text = `Tekanan jual terlihat pada ${d.name}.`;
    if (d.close !== null && d.sma50 !== null && d.close < d.sma50) {
      text += ` Harga berada di bawah SMA50 (${price(d.sma50)}), sinyal tren turun.`;
    }
    if (support !== null) {
      text += ` Support terdekat di ${price(support)} — jika jebol, potensi penurunan lanjutan.`;
    }
    return text;
  }
  let text = `${d.name} berada dalam kondisi netral — sinyal teknikal campuran tanpa dominasi jelas.`;
  if (support !== null && resistance !== null) {
    text += ` Range harian: ${price(support)} - ${price(resistance)}.`;
  }
  text += ` Disarankan menunggu konfirmasi arah yang lebih jelas.`;
  return text;
}

function watchlistItems(d: TemplateData, support: number | null, resistance: number | null): string[] {
  const items: string[] = [];

  if (support !== null && d.close !== null) {
    items.push(`Jika harga turun di bawah ${price(support)} (support), momentum bullish bisa gagal`);
  }
  if (d.rsi14 !== null && d.rsi14 > 60) {
    items.push(`RSI sudah di ${d.rsi14.toFixed(1)} — waspadai potensi koreksi jangka pendek`);
  }
  if (d.rsi14 !== null && d.rsi14 < 40) {
    items.push(`RSI di ${d.rsi14.toFixed(1)} — masih lemah, konfirmasi reversal belum terlihat`);
  }
  if (resistance !== null && d.close !== null) {
    items.push(`Resistance di ${price(resistance)} harus tembus untuk konfirmasi lanjutan`);
  }
  items.push(`Perhatikan volume besok: jika menurun drastis, bisa sinyal pelemahan momentum`);

  return items.slice(0, 3);
}

function tipText(outlook: Outlook, d: TemplateData): string {
  if (outlook === "BULLISH") {
    if (d.rsi14 !== null && d.rsi14 < 35) {
      return `RSI ${d.name} saat ini berada di zona oversold (${d.rsi14.toFixed(1)}). Secara teknikal, ini bisa menjadi peluang entry bagi investor yang yakin dengan fundamental perusahaan. Gunakan konfirmasi dari indikator lain sebelum mengambil posisi.`;
    }
    return `Beberapa indikator menunjukkan sinyal bullish pada ${d.name}. Perhatikan level resistance terdekat sebagai target profit dan gunakan stop loss untuk membatasi risiko.`;
  }
  if (outlook === "BEARISH") {
    if (d.rsi14 !== null && d.rsi14 > 65) {
      return `RSI ${d.name} menunjukkan kondisi overbought (${d.rsi14.toFixed(1)}). Pertimbangkan untuk menunggu koreksi sebelum mengambil posisi. Jika sudah持有, pertimbangkan trailing stop untuk mengamankan keuntungan.`;
    }
    return `Sebagian indikator menunjukkan tekanan jual pada ${d.name}. Disarankan untuk menunggu konfirmasi reversal atau sinyal support bertahan sebelum entry.`;
  }
  return `${d.name} berada dalam kondisi netral — tidak ada sinyal kuat dari indikator teknikal. Disarankan menunggu breakout dari range saat ini atau konfirmasi dari volume perdagangan.`;
}

export function buildTemplateArticle(data: TemplateData): string {
  const t = data.ticker.replace(".JK", "");
  const month = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const outlook = determineOutlook(data);
  const outlookEmoji = outlook === "BULLISH" ? "🟢" : outlook === "BEARISH" ? "🔴" : "🟡";

  // Support/resistance estimation
  const supports: number[] = [];
  const resistances: number[] = [];
  if (data.bbLower !== null) supports.push(data.bbLower);
  if (data.sma50 !== null && data.close !== null && data.sma50 < data.close) supports.push(data.sma50);
  if (data.supertrend !== null && data.close !== null && data.supertrend < data.close) supports.push(data.supertrend);
  if (data.bbUpper !== null) resistances.push(data.bbUpper);
  if (data.sma50 !== null && data.close !== null && data.sma50 > data.close) resistances.push(data.sma50);
  if (data.supertrend !== null && data.close !== null && data.supertrend > data.close) resistances.push(data.supertrend);

  const support = supports.length > 0 ? Math.max(...supports) : data.week52Low;
  const resistance = resistances.length > 0 ? Math.min(...resistances) : data.week52High;

  // SMA crossover signals
  const smaCrossNote = data.sma20 !== null && data.sma50 !== null
    ? (data.sma20 > data.sma50
      ? `SMA20 berada di atas SMA50 (golden cross) — sinyal bullish jangka pendek-menengah.`
      : `SMA20 berada di bawah SMA50 (death cross) — sinyal bearish jangka pendek-menengah.`)
    : "";

  return `## Ringkasan Analisa Teknikal ${data.name} (${t}) — ${month}

${outlookEmoji} **Outlook: ${outlook}**

Analisa teknikal ${data.name} (${t}) menunjukkan kondisi **${outlook.toLowerCase()}** berdasarkan konsensus indikator momentum dan tren. Saham ditutup pada ${price(data.close)} (${pct(data.changePercent)}) dengan volume perdagangan ${data.volume ? fmt(data.volume) : "N/A"} lot.

## Analisa Harga Terkini

| Metrik | Nilai |
|--------|-------|
| Harga terakhir | ${price(data.close)} |
| Perubahan hari ini | ${pct(data.changePercent)} |
| Volume | ${data.volume ? fmt(data.volume) : "N/A"} |
| Range 52 minggu | ${price(data.week52Low)} - ${price(data.week52High)} |

Saham ${data.name} ditutup pada ${price(data.close)} (${pct(data.changePercent)}). Harga berada ${trendLabel(data.close, data.sma200)}.

## Indikator Momentum

| Indikator | Nilai | Interpretasi |
|-----------|-------|--------------|
| RSI(14) | ${data.rsi14 !== null ? data.rsi14.toFixed(1) : "N/A"} | ${rsiLabel(data.rsi14)} |
| Stochastic %K/%D | ${data.stochK !== null ? data.stochK.toFixed(1) : "N/A"} / ${data.stochD !== null ? data.stochD.toFixed(1) : "N/A"} | ${stochLabel(data.stochK, data.stochD)} |

${data.rsi14 !== null && data.rsi14 < 30
    ? `RSI berada di zona oversold (<30) yang secara historis sering mendahului rebound harga. Namun, di tren turun yang kuat, RSI bisa bertahan di oversold dalam waktu lama.`
    : data.rsi14 !== null && data.rsi14 > 70
    ? `RSI berada di zona overbought (>70) yang mengindikasikan potensi koreksi harga dalam waktu dekat.`
    : `RSI berada di area normal, menunjukkan momentum yang seimbang antara tekanan beli dan jual.`}

## Indikator Tren

| Indikator | Nilai | Interpretasi |
|-----------|-------|--------------|
| MACD Histogram | ${data.macdHist !== null ? data.macdHist.toFixed(2) : "N/A"} | ${macdLabel(data.macdHist)} |
| ADX | ${data.adx !== null ? data.adx.toFixed(1) : "N/A"} | ${adxLabel(data.adx)} |
| SMA 20/50/200 | ${price(data.sma20)} / ${price(data.sma50)} / ${price(data.sma200)} | Posisi harga vs moving average |
| Supertrend | ${price(data.supertrend)} | ${data.close !== null && data.supertrend !== null ? (data.close > data.supertrend ? "Sinyal beli (harga di atas supertrend)" : "Sinyal jual (harga di bawah supertrend)") : "N/A"} |

${smaCrossNote}

${data.adx !== null && data.adx > 25
    ? `ADX menunjukkan tren sedang aktif (${data.adx.toFixed(1)}). Disarankan untuk mengikuti arah tren saat ini.`
    : data.adx !== null
    ? `ADX menunjukkan pasar sedang sideways (${data.adx.toFixed(1)}). Strategi range-bound trading lebih sesuai.`
    : ""}

## Volatilitas

| Metrik | Nilai |
|--------|-------|
| Bollinger Bands Upper | ${price(data.bbUpper)} |
| Bollinger Bands Lower | ${price(data.bbLower)} |
| ATR (Average True Range) | ${data.atr !== null ? fmt(data.atr) : "N/A"} |
| Volatilitas | ${atrLabel(data.atr, data.close)} |

${data.bbUpper !== null && data.bbLower !== null && data.close !== null
    ? (data.close > data.bbUpper
      ? `Harga menembus upper Bollinger Band — biasanya mengindikasikan kondisi overbought ekstrem atau breakout kuat.`
      : data.close < data.bbLower
      ? `Harga menembus lower Bollinger Band — bisa menjadi tanda oversold atau breakdown.`
      : `Harga berada di dalam Bollinger Bands, menunjukkan pergerakan normal.`)
    : ""}

## Level Kunci

| Level | Harga |
|-------|-------|
| **Support** | ${price(support)} |
| **Resistance** | ${price(resistance)} |

${data.close !== null ? `Harga saat ini (${price(data.close)}) berada ${data.close > (support ?? 0) ? `${fmt(((data.close - (support ?? 0)) / (support || 1)) * 100)}% di atas support` : "di bawah support"}.` : ""}

## Kesimpulan

**Outlook: ${outlook}**

${outlook === "BULLISH"
    ? `Mayoritas indikator teknikal menunjukkan sinyal positif untuk ${data.name}. Momentum menguat dengan RSI di area ${data.rsi14 !== null && data.rsi14 < 40 ? "oversold yang berpotensi rebound" : "normal positif"}. Perhatikan resistance di ${price(resistance)} sebagai target selanjutnya.`
    : outlook === "BEARISH"
    ? `Indikator teknikal menunjukkan tekanan jual pada ${data.name}. ${data.rsi14 !== null && data.rsi14 > 60 ? "RSI mendekati overbought, waspadai koreksi lanjutan." : "Momentum tren menurun masih dominan."} Support terdekat di ${price(support)}.`
    : `Indikator teknikal menunjukkan sinyal campuran untuk ${data.name}. Tidak ada dominasi jelas antara tekanan beli dan jual. Disarankan menunggu konfirmasi arah yang lebih jelas.`}

:::tip[Tips Trading ${t}]
${tipText(outlook, data)}
:::

## Kata Kunci Terkait

| Keyword | Konteks |
|---------|---------|
| analisa teknikal ${t} | Headline, kesimpulan |
| saham ${data.name} hari ini | Ringkasan, analisa harga |
| harga saham ${t} | Tabel metrik, level kunci |
| prediksi saham ${t} | Kesimpulan & outlook |

:::warning[Disclaimer On]
Analisa teknikal di atas berdasarkan data historis dan indikator matematis. Artikel ini disusun untuk tujuan edukasi dan informasi semata, bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::

:::cta[Pantau ${t} Real-time]
Lihat pergerakan harga ${data.name} secara real-time lengkap dengan chart interaktif dan indikator teknikal di halaman saham ${t} di TeknikalID.
:::
`;
}

export function buildDailySnapshot(data: TemplateData): string {
  try {
    return buildDailySnapshotEnhanced(data);
  } catch (err) {
    console.error("[article-template] buildDailySnapshot failed, using fallback:", err instanceof Error ? err.message : err);
    return buildDailySnapshotFallback(data);
  }
}

function buildDailySnapshotFallback(data: TemplateData): string {
  const t = data.ticker.replace(".JK", "");
  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const outlook = determineOutlook(data);
  const outlookText = outlook === "BULLISH" ? "POSITIF (Bullish)" : outlook === "BEARISH" ? "NEGATIF (Bearish)" : "NETRAL";

  const supports: number[] = [];
  const resistances: number[] = [];
  if (data.bbLower !== null) supports.push(data.bbLower);
  if (data.supertrend !== null && data.close !== null && data.supertrend < data.close) supports.push(data.supertrend);
  if (data.sma50 !== null && data.close !== null && data.sma50 < data.close) supports.push(data.sma50);
  if (data.bbUpper !== null) resistances.push(data.bbUpper);
  if (data.supertrend !== null && data.close !== null && data.supertrend > data.close) resistances.push(data.supertrend);
  if (data.sma50 !== null && data.close !== null && data.sma50 > data.close) resistances.push(data.sma50);
  const support = supports.length > 0 ? Math.max(...supports) : data.week52Low;
  const resistance = resistances.length > 0 ? Math.min(...resistances) : data.week52High;

  return `## Saham ${data.name} (${t}) Hari Ini — ${date}

Ringkasan pergerakan saham ${data.name} (${t}) hari ini, ${date}.

| Metrik | Nilai |
|--------|-------|
| Harga terakhir | ${price(data.close)} |
| Perubahan hari ini | ${pct(data.changePercent)} |
| Volume | ${data.volume ? fmt(data.volume) : "N/A"} |
| Range 52 minggu | ${price(data.week52Low)} - ${price(data.week52High)} |

| Indikator | Nilai | Sinyal |
|-----------|-------|--------|
| RSI(14) | ${data.rsi14 !== null ? data.rsi14.toFixed(1) : "N/A"} | ${data.rsi14 !== null ? (data.rsi14 < 30 ? "Oversold" : data.rsi14 > 70 ? "Overbought" : "Normal") : "N/A"} |
| MACD Histogram | ${data.macdHist !== null ? data.macdHist.toFixed(2) : "N/A"} | ${data.macdHist !== null ? (data.macdHist > 0 ? "Bullish" : "Bearish") : "N/A"} |
| ADX | ${data.adx !== null ? data.adx.toFixed(1) : "N/A"} | ${data.adx !== null ? (data.adx > 25 ? "Trending" : "Sideways") : "N/A"} |
| Supertrend | ${price(data.supertrend)} | ${data.close !== null && data.supertrend !== null ? (data.close > data.supertrend ? "Beli" : "Jual") : "N/A"} |

**Support:** ${price(support)} | **Resistance:** ${price(resistance)}

**Sentimen: ${outlookText}**

${outlook === "BULLISH"
    ? `Mayoritas indikator menunjukkan sinyal positif. Perhatikan resistance di ${price(resistance)}.`
    : outlook === "BEARISH"
    ? `Tekanan jual terlihat. Support terdekat di ${price(support)}.`
    : `Sinyal campuran — menunggu konfirmasi arah.`}

:::warning[Disclaimer On]
Data di atas merupakan snapshot pada waktu publish dan dapat berubah. Artikel ini disusun untuk tujuan edukasi dan informasi semata, bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::

:::cta[Lihat Chart ${t} Live]
Pantau pergerakan harga ${data.name} secara real-time di halaman saham ${t} di TeknikalID.
:::
`;
}

function buildDailySnapshotEnhanced(data: TemplateData): string {
  const t = data.ticker.replace(".JK", "");
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const now = new Date();
  const dayName = days[now.getDay()];
  const date = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const signalText = signalLabelToId(data.signalLabel ?? null);
  const signalScore = data.signalScore ?? null;
  const signalDisplay = signalScore !== null ? `${signalText} | Skor: ${signalScore > 0 ? "+" : ""}${signalScore.toFixed(2)}` : signalText;

  // Support / resistance computation
  const supports: number[] = [];
  const resistances: number[] = [];
  if (data.bbLower !== null) supports.push(data.bbLower);
  if (data.supertrend !== null && data.close !== null && data.supertrend < data.close) supports.push(data.supertrend);
  if (data.sma50 !== null && data.close !== null && data.sma50 < data.close) supports.push(data.sma50);
  if (data.bbUpper !== null) resistances.push(data.bbUpper);
  if (data.supertrend !== null && data.close !== null && data.supertrend > data.close) resistances.push(data.supertrend);
  if (data.sma50 !== null && data.close !== null && data.sma50 > data.close) resistances.push(data.sma50);
  const support = supports.length > 0 ? Math.max(...supports) : data.week52Low;
  const resistance = resistances.length > 0 ? Math.min(...resistances) : data.week52High;

  // Opening narrative
  const direction = data.changePercent !== null
    ? (data.changePercent > 0 ? "naik" : data.changePercent < 0 ? "melemah" : "stagnan")
    : "bergerak";
  const openNarrative = data.close !== null && data.changePercent !== null
    ? `${data.name} ditutup ${direction} **${pct(data.changePercent)}** ke **${price(data.close)}** hari ini${
        data.close !== null && data.sma50 !== null
          ? (data.close > data.sma50 ? ", menguat di atas garis SMA50" : ", melemah di bawah garis SMA50")
          : ""
      }. Volume perdagangan mencapai ${formatVolumeHuman(data.volume)}, menunjukkan partisipasi investor yang ${data.volume !== null && data.volume > 1e7 ? "aktif" : "cukup"}.`
    : `Ringkasan pergerakan saham ${data.name} hari ini, ${date}.`;

  // Support/resistance narrative
  const levelNarrative = `Support terdekat di **${price(support)}**.${
    resistance !== null ? ` Resistance di **${price(resistance)}**.` : ""
  }${
    resistance !== null && data.week52High !== null && resistance < data.week52High
      ? ` Jika tembus ${price(resistance)}, target selanjutnya ${price(data.week52High)} (high 52 minggu).`
      : ""
  }`;

  // Kesimpulan
  const conclusionText = outlookNarrative(data, support, resistance);
  const conclusionLabel = signalText;

  // Watchlist items
  const tips = watchlistItems(data, support, resistance);

  // Fundamental section (conditional)
  const fundamentalSection = buildFundamentalSection(data);

  // Gorengan warning (conditional)
  const gorenganWarning = data.isGorengan === true
    ? `\n:::warning[Saham Gorengan — EKSTRA HATI-HATI]\nSaham ini terdeteksi sebagai **saham gorengan** berdasarkan volume abnormal, volatilitas tinggi, dan/atau market cap kecil. Pergerakan harga bisa sangat tidak wajar dan berisiko tinggi. Jangan tergiur kenaikan harga semata — selalu gunakan stop loss ketat.\n:::\n`
    : "";

  return `## Saham ${data.name} Hari Ini — ${dayName}, ${date}

**Sinyal: ${signalDisplay}**

${openNarrative}

| | |
|---|---|
| **Harga Tutup** | ${price(data.close)} |
| **Perubahan** | ${pct(data.changePercent)} |
| **Tertinggi / Terendah** | ${price(data.high ?? null)} / ${price(data.low ?? null)} |
| **Volume** | ${formatVolumeHuman(data.volume)} |
| **Range 52 Minggu** | ${price(data.week52Low)} - ${price(data.week52High)} |

${buildChecklist(data)}
${gorenganWarning}
**Level yang Perlu Diperhatikan:**

${levelNarrative}
${fundamentalSection ? `\n${fundamentalSection}\n` : ""}
**Kesimpulan: ${conclusionLabel}**

${conclusionText}

:::tip[Yang Perlu Diwaspadai]
${tips.map((item) => `- ${item}`).join("\n")}
:::

## Kata Kunci Terkait

| Keyword | Konteks |
|---------|---------|
| saham ${data.name} hari ini | Headline, ringkasan |
| analisa teknikal ${t} | Sinyal teknikal, kesimpulan |
| harga saham ${t} | Tabel harga, level kunci |

:::warning[Disclaimer On]
Analisa teknikal di atas berdasarkan data historis dan indikator matematis. Artikel ini disusun untuk tujuan edukasi dan informasi semata, bukan merupakan rekomendasi membeli atau menjual instrumen keuangan. Keputusan investasi sepenuhnya menjadi tanggung jawab pembaca. Selalu lakukan riset mandiri (DYOR) dan pertimbangkan konsultasi dengan penasihat keuangan berlisensi OJK sebelum mengambil keputusan investasi.
:::

:::cta[Pantau ${t} Real-time]
Lihat chart interaktif, indikator teknikal lengkap, dan trading plan ${data.name} di halaman saham ${t} di TeknikalID.
:::
`;
}

export function buildDailySlug(ticker: string): string {
  const t = ticker.replace(".JK", "").toLowerCase();
  const now = new Date();
  const day = now.getDate();
  const months = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `saham-${t}-${day}-${month}-${year}`;
}
