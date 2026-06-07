export interface Translation {
  short: string;
  explanation: string;
  sentiment: "positif" | "negatif" | "netral";
}

export function translateRSI(rsi: number | null): Translation {
  if (rsi === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (rsi < 20) return { short: "Sangat Jenuh Jual", explanation: "Harga sudah turun sangat dalam. Bisa rebound, tapi tetap waspada.", sentiment: "positif" };
  if (rsi < 30) return { short: "Jenuh Jual", explanation: "Tekanan jual mulai berlebihan. Potensi rebound mendekati.", sentiment: "positif" };
  if (rsi < 45) return { short: "Netral Cenderung Lemah", explanation: "Momentum belum kuat, tapi pergerakan masih sehat.", sentiment: "netral" };
  if (rsi < 55) return { short: "Netral", explanation: "Pergerakan harga seimbang, tidak ada tekanan berlebih.", sentiment: "netral" };
  if (rsi < 70) return { short: "Netral Cenderung Kuat", explanation: "Momentum positif, pergerakan masih sehat.", sentiment: "netral" };
  if (rsi < 80) return { short: "Jenuh Beli", explanation: "Tekanan beli tinggi. Peluang koreksi mulai mengintai.", sentiment: "negatif" };
  return { short: "Sangat Jenuh Beli", explanation: "Risiko koreksi tinggi. Pertimbangkan untuk mengunci profit.", sentiment: "negatif" };
}

export function translateMACD(hist: number | null): Translation {
  if (hist === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (hist > 0) return { short: "Momentum Naik", explanation: "Tekanan beli semakin kuat.", sentiment: "positif" };
  if (hist < 0) return { short: "Momentum Turun", explanation: "Tekanan jual mendominasi.", sentiment: "negatif" };
  return { short: "Momentum Netral", explanation: "Belum ada arah jelas.", sentiment: "netral" };
}

export function translateStochastic(k: number | null, d: number | null): Translation {
  if (k === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (k > 80) return { short: "Jenuh Beli", explanation: "Harga di zona tertinggi. Risiko koreksi.", sentiment: "negatif" };
  if (k < 20) return { short: "Jenuh Jual", explanation: "Harga di zona terendah. Potensi rebound.", sentiment: "positif" };
  if (d !== null && k > d) return { short: "Bullish Cross", explanation: "Momentum naik.", sentiment: "positif" };
  if (d !== null && k < d) return { short: "Bearish Cross", explanation: "Momentum turun.", sentiment: "negatif" };
  return { short: "Zona Netral", explanation: "Pergerakan normal.", sentiment: "netral" };
}

export function translateBB(position: number | null): Translation {
  if (position === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (position > 85) return { short: "Di Atas Band", explanation: "Volatilitas tinggi, waspadai koreksi.", sentiment: "negatif" };
  if (position > 60) return { short: "Mendekati Batas Atas", explanation: "Harga mendekati resistance.", sentiment: "netral" };
  if (position > 40) return { short: "Di Tengah Band", explanation: "Harga bergerak normal.", sentiment: "netral" };
  if (position > 15) return { short: "Mendekati Batas Bawah", explanation: "Harga mendekati support.", sentiment: "netral" };
  return { short: "Di Bawah Band", explanation: "Bisa jadi oversold atau breakdown.", sentiment: "negatif" };
}

export function translateADX(adx: number | null): Translation {
  if (adx === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (adx > 50) return { short: "Tren Sangat Kuat", explanation: "Tren sangat kuat. Waspadai potensi jenuh.", sentiment: "positif" };
  if (adx > 25) return { short: "Tren Kuat", explanation: "Tren sedang berlangsung. Ikuti arah tren.", sentiment: "positif" };
  if (adx > 20) return { short: "Tren Mulai Terbentuk", explanation: "Pergerakan mulai menunjukkan arah.", sentiment: "netral" };
  return { short: "Tren Lemah", explanation: "Belum ada arah jelas. Harga bergerak sideways.", sentiment: "netral" };
}

export function translateVWAP(price: number | null, vwap: number | null): Translation {
  if (price === null || vwap === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (price > vwap) return { short: "Di Atas VWAP", explanation: "Sentimen positif intraday.", sentiment: "positif" };
  return { short: "Di Bawah VWAP", explanation: "Sentimen negatif intraday.", sentiment: "negatif" };
}

export function translateATR(atr: number | null, price: number | null): Translation {
  if (atr === null || price === null || price === 0) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  const pct = (atr / price) * 100;
  if (pct < 1) return { short: "Volatilitas Rendah", explanation: "Pergerakan harian kecil.", sentiment: "netral" };
  if (pct < 3) return { short: "Volatilitas Normal", explanation: "Pergerakan harian wajar.", sentiment: "netral" };
  if (pct < 5) return { short: "Volatilitas Tinggi", explanation: "Perhatikan ukuran posisi.", sentiment: "negatif" };
  return { short: "Volatilitas Sangat Tinggi", explanation: "Ekstra hati-hati.", sentiment: "negatif" };
}

export function translateCrossSignal(signal: string | null, type: "sma" | "ema"): Translation {
  if (!signal) return { short: "Tidak Ada Cross", explanation: "Tidak ada sinyal cross terbaru.", sentiment: "netral" };
  if (type === "sma") {
    if (signal === "golden_cross") return { short: "Golden Cross", explanation: "SMA 50 memotong SMA 200 ke atas — sinyal bullish jangka panjang.", sentiment: "positif" };
    return { short: "Death Cross", explanation: "SMA 50 memotong SMA 200 ke bawah — sinyal bearish jangka panjang.", sentiment: "negatif" };
  }
  if (signal === "bullish") return { short: "EMA Bullish Cross", explanation: "EMA 12 memotong EMA 26 ke atas — momentum naik.", sentiment: "positif" };
  return { short: "EMA Bearish Cross", explanation: "EMA 12 memotong EMA 26 ke bawah — momentum turun.", sentiment: "negatif" };
}

export function translateOBV(obvTrend: string | null): Translation {
  if (!obvTrend) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (obvTrend === "Accumulation") return { short: "Akumulasi", explanation: "Volume beli mendominasi. Tekanan naik.", sentiment: "positif" };
  return { short: "Distribusi", explanation: "Volume jual mendominasi. Tekanan turun.", sentiment: "negatif" };
}

export function translateSupertrend(price: number | null, supertrend: number | null): Translation {
  if (price === null || supertrend === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (price > supertrend) return { short: "Bullish", explanation: "Harga di atas Supertrend. Tren naik.", sentiment: "positif" };
  return { short: "Bearish", explanation: "Harga di bawah Supertrend. Tren turun.", sentiment: "negatif" };
}

export function translateSMA(sma20: number | null, sma50: number | null, sma200: number | null, price: number | null): Translation {
  if (price === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  const above20 = sma20 !== null && price > sma20;
  const above50 = sma50 !== null && price > sma50;
  const above200 = sma200 !== null && price > sma200;
  const aboveCount = [above20, above50, above200].filter(Boolean).length;
  if (aboveCount === 3) return { short: "Tren Kuat Naik", explanation: "Harga di atas semua SMA. Tren bullish solid.", sentiment: "positif" };
  if (aboveCount >= 2) return { short: "Cenderung Naik", explanation: "Mayoritas SMA di bawah harga.", sentiment: "positif" };
  if (aboveCount === 0) return { short: "Tren Kuat Turun", explanation: "Harga di bawah semua SMA. Tren bearish.", sentiment: "negatif" };
  return { short: "Campuran", explanation: "Harga berada di antara SMA. Tren belum jelas.", sentiment: "netral" };
}

export function translateEMA(ema12: number | null, ema26: number | null, price: number | null): Translation {
  if (price === null || ema12 === null || ema26 === null) return { short: "Tidak ada data", explanation: "", sentiment: "netral" };
  if (price > ema12 && ema12 > ema26) return { short: "Momentum Naik", explanation: "EMA 12 di atas EMA 26. Bullish.", sentiment: "positif" };
  if (price < ema12 && ema12 < ema26) return { short: "Momentum Turun", explanation: "EMA 12 di bawah EMA 26. Bearish.", sentiment: "negatif" };
  return { short: "Netral", explanation: "EMA berdekatan. Belum ada arah jelas.", sentiment: "netral" };
}

// --- Tooltip definitions for indicators ---

export const INDICATOR_TIPS: Record<string, string> = {
  RSI: "Relative Strength Index — Mengukur kecepatan perubahan harga. Di atas 70 = jenuh beli, di bawah 30 = jenuh jual.",
  MACD: "Moving Average Convergence Divergence — Menunjukkan arah momentum. Histogram positif = tekanan beli, negatif = tekanan jual.",
  SMA: "Simple Moving Average — Harga rata-rata over periode tertentu. Jika harga di atas SMA, tren cenderung naik.",
  EMA: "Exponential Moving Average — Seperti SMA tapi lebih responsif terhadap perubahan terbaru. EMA 12 di atas EMA 26 = bullish.",
  "Bollinger Bands": "Band volatilitas di atas dan bawah SMA 20. Harga mendekati band atas = kemungkinan overbought.",
  Stochastic: "Membandingkan harga penutupan dengan range periode tertentu. Di atas 80 = jenuh beli, di bawah 20 = jenuh jual.",
  ADX: "Average Directional Index — Mengukur kekuatan tren (bukan arah). Di atas 25 = tren kuat, di bawah 20 = sideways.",
  OBV: "On-Balance Volume — Mengukur tekanan beli/jual berdasarkan volume. Naik = akumulasi, turun = distribusi.",
  Supertrend: "Indikator tren berbasis ATR. Harga di atas Supertrend = bullish, di bawah = bearish.",
  VWAP: "Volume Weighted Average Price — Harga rata-rata berbobot volume. Acuan institusi, harga di atas VWAP = sentimen positif.",
  ATR: "Average True Range — Mengukur volatilitas. Nilai tinggi = pergerakan besar, rendah = pergerakan kecil.",
  "Health Score": "Skor 0-100 berdasarkan 9 indikator teknikal. Mengukur kondisi keseluruhan saham: tren, momentum, dan volume.",
  Gorengan: "Saham dengan volatilitas tinggi dan volume tidak wajar — cenderung dimanipulasi. Hati-hati, bukan untuk pemula.",
  Signal: "Sinyal gabungan dari semua indikator teknikal. Strong Bullish/Bearish = mayoritas indikator searah.",
  Volatilitas: "Persentase pergerakan harga harian berdasarkan ATR. Tinggi = risiko besar, rendah = pergerakan tenang.",
  "Golden Cross": "SMA 50 memotong SMA 200 ke atas — sinyal bullish jangka panjang.",
  "Death Cross": "SMA 50 memotong SMA 200 ke bawah — sinyal bearish jangka panjang.",
};
