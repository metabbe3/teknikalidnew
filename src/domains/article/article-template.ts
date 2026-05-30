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

:::warning[Peringatan Risiko]
Analisa teknikal di atas berdasarkan data historis dan indikator matematis. Ini bukan rekomendasi beli atau jual. Selalu gunakan manajemen risiko yang baik, tentukan stop loss, dan pertimbangkan kondisi fundamental perusahaan sebelum mengambil keputusan investasi.
:::

:::cta[Pantau ${t} Real-time]
Lihat pergerakan harga ${data.name} secara real-time lengkap dengan chart interaktif dan indikator teknikal di halaman saham ${t} di TeknikalID.
:::
`;
}

export function buildDailySnapshot(data: TemplateData): string {
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

Ringkasan pergerakan saham ${data.name} (${t}) hari ini, ${date}. Berikut data harga, indikator teknikal, dan outlook terkini.

## Harga ${data.name} Hari Ini

| Metrik | Nilai |
|--------|-------|
| Harga terakhir | ${price(data.close)} |
| Perubahan hari ini | ${pct(data.changePercent)} |
| Volume | ${data.volume ? fmt(data.volume) : "N/A"} |
| Range 52 minggu | ${price(data.week52Low)} - ${price(data.week52High)} |

## Indikator Teknikal ${t} Hari Ini

| Indikator | Nilai | Sinyal |
|-----------|-------|--------|
| RSI(14) | ${data.rsi14 !== null ? data.rsi14.toFixed(1) : "N/A"} | ${data.rsi14 !== null ? (data.rsi14 < 30 ? "Oversold" : data.rsi14 > 70 ? "Overbought" : "Normal") : "N/A"} |
| MACD Histogram | ${data.macdHist !== null ? data.macdHist.toFixed(2) : "N/A"} | ${data.macdHist !== null ? (data.macdHist > 0 ? "Bullish" : "Bearish") : "N/A"} |
| ADX | ${data.adx !== null ? data.adx.toFixed(1) : "N/A"} | ${data.adx !== null ? (data.adx > 25 ? "Trending" : "Sideways") : "N/A"} |
| SMA 20/50/200 | ${price(data.sma20)} / ${price(data.sma50)} / ${price(data.sma200)} | ${data.close !== null && data.sma50 !== null ? (data.close > data.sma50 ? "Di atas SMA50" : "Di bawah SMA50") : "N/A"} |
| Bollinger Bands | ${price(data.bbLower)} - ${price(data.bbUpper)} | ${data.close !== null && data.bbUpper !== null && data.bbLower !== null ? (data.close > data.bbUpper ? "Di atas upper band" : data.close < data.bbLower ? "Di bawah lower band" : "Di dalam bands") : "N/A"} |
| Supertrend | ${price(data.supertrend)} | ${data.close !== null && data.supertrend !== null ? (data.close > data.supertrend ? "Beli" : "Jual") : "N/A"} |

## Level Support & Resistance

| Level | Harga |
|-------|-------|
| **Support** | ${price(support)} |
| **Resistance** | ${price(resistance)} |

## Outlook ${t} Hari Ini

**Sentimen: ${outlookText}**

${outlook === "BULLISH"
    ? `Mayoritas indikator menunjukkan sinyal positif untuk ${data.name}. Momentum menguat, perhatikan resistance di ${price(resistance)} sebagai target selanjutnya.`
    : outlook === "BEARISH"
    ? `Tekanan jual terlihat pada ${data.name}. Support terdekat di ${price(support)}, jika tembus potensi penurunan lanjutan.`
    : `Sinyal indikator campuran — belum ada dominasi jelas. Disarankan menunggu konfirmasi arah.`}

:::warning[Peringatan]
Data di atas merupakan snapshot pada waktu publish dan dapat berubah. Bukan rekomendasi beli/jual. Selalu gunakan manajemen risiko.
:::

:::cta[Lihat Chart ${t} Live]
Pantau pergerakan harga ${data.name} secara real-time di halaman saham ${t} di TeknikalID.
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
