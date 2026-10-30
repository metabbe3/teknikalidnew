/**
 * AI ticker guard (owner 30 Okt: "Saham apa yang YANG lagi oke" → salah route ke YANG.JK).
 * Kata Indonesia/istilah finansial 4-huruf yang JUGA ticker IDX (atau mirip) tidak boleh
 * memicu routing per-saham. Dipakai: ask-ai-fab (routing client), stock route (COMPARE), ai-markdown (chips).
 */

// Kata umum bahasa Indonesia + istilah finansial/indikator yang BUKAN maksud ticker.
// Kecil semua; bandingkan dengan kandidat .toLowerCase().
export const TICKER_FALSE_POSITIVES = new Set([
  // kata tanya / penghubung Indonesia
  "yang", "data", "sama", "bila", "agar", "biar", "supa", "atau", "dan", "dari",
  "kepu", "kapan", "dimana", "gimana", "kenapa", "apakah", "bagaimana", "seberapa",
  "masih", "sudah", "belum", "akan", "bisa", "dulu", "lagi", "nih", "tuh", "dong",
  "kayak", "gitu", "gini", "banget", "amat", "sangat", "cukup", "agak",
  "mana", "link", "kalo", "kalau", "tolong", "cekin", "cek", "beda", "bedanya", "ketemu", "itung",
  // istilah finansial/indikator (bukan ticker IDX)
  "macd", "rsi", "adx", "atr", "obv", "sma", "ema", "bb", "pe", "pb", "roe", "roa",
  "eps", "ara", "arb", "fca", "uma", "ipo", "idx", "ihsg", "jci", "notchl", "notch",
  "cut", "loss", "sell", "buyn", "hold", "avg", "unit", "lot", "share", "price",
  "up", "down", "high", "low", "open", "prev", "divi", "yield", "ratio", "value",
  "bull", "bear", "tren", "naik", "turun", "flat", "gain", "drop",
  "bank", "saham", "emit", "boleh", "jangan", "harus", "mauu", "mahu",
  "noted", "notes", "info", "news", "today", "hari", "ini",
]);

// Ticker IDX asli yang TABRAKAN dengan kata Indonesia/istilah (diverifikasi DB 963 emiten 30 Okt):
// AGAR BANK BULL DATA NAIK SUPA UNIT. Kata-kata ini SUPER sering muncul di kalimat tanya,
// jadi hanya dianggap ticker kalau user nulis HURUF BESAR eksplisit ("DATA saham apa") —
// bukan saat mengetik "data" lowercase dalam kalimat normal.
export const AMBIGUOUS_REAL_TICKERS = new Set(["AGAR", "BANK", "BULL", "DATA", "NAIK", "SUPA", "UNIT"]);

/**
 * Kandidat 4-huruf → layak dianggap ticker?
 * Rule urut: 4 char A-Z; bukan false-positive; kalau AMBIGUOUS (ticker asli tapi juga kata
 * Indonesia) wajib ditulis uppercase oleh user di teks asli.
 */
export function isPlausibleTicker(
  candidate: string | undefined | null,
  original?: string,
): boolean {
  if (!candidate) return false;
  const t = candidate.toUpperCase().replace(/\.JK$/, "");
  if (!/^[A-Z]{4}$/.test(t)) return false;
  // AMBIGUOUS real-ticker (DATA/SUPA/dll) dicek SEBELUM false-positive list:
  // uppercase eksplisit dari user = niat ticker, menang atas kata umum.
  if (AMBIGUOUS_REAL_TICKERS.has(t)) {
    // hanya kalau di teks asli benar-benar huruf besar semua (bukan hasil toUpperCase kita)
    if (!original) return false;
    const re = new RegExp(`\\b${t}\\b`);
    return re.test(original);
  }
  return true;
}

/**
 * Ambil ticker pertama yang layak dari teks pertanyaan.
 * Scan BOTH: kata uppercase asli (sinyal kuat niat ticker) DAN kata 4-huruf apapun
 * yang cocok pattern (user sering nulis kecil: "apakah bbca layak").
 */
export function detectTickerInText(text: string): string | null {
  // Pass 1: kata yang ditulis UPPERCASE asli oleh user — sinyal kuat niat ticker.
  // Catatan: "Saham apa yang lagi oke" punya "Saham" kapital awal, tapi 4-huruf uppercase
  // penuh ("YANG") hanya muncul kalau user memang menulis begitu → tetap lolos filter kata umum.
  const upperMatches = text.match(/\b[A-Z]{4}\b/g) ?? [];
  for (const m of upperMatches) {
    if (isPlausibleTicker(m, text)) return m;
  }
  // Pass 2: kata apapun 4-huruf alfabet yang BUKAN kata umum Indonesia di teks ASLI.
  // "bbca" (lowercase, bukan kata kamus) → BBCA ✓; "yang/mana/link" (kata kamus) → skip ✓.
  const wordMatches = text.toLowerCase().match(/\b[a-z]{4}\b/g) ?? [];
  for (const w of wordMatches) {
    if (TICKER_FALSE_POSITIVES.has(w)) continue;
    if (AMBIGUOUS_REAL_TICKERS.has(w.toUpperCase())) continue; // kata kamus ambigu → butuh uppercase eksplisit
    return w.toUpperCase();
  }
  return null;
}
