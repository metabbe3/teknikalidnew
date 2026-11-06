/**
 * AI text sanitizer — guard deterministik pasca-LLM.
 *
 * Latar: 5 Nov 2026 jawaban screener bocor karakter Mandarin ("Market lagi喜庆
 * banget nih") — GLM hallucination bahasa pada konten berbahasa Indonesia.
 * Kontrak UI teknikal.id = Bahasa Indonesia murni; karakter CJK dilarang tampil
 * ke user. Sanitizer ini deterministik (bukan andalan model), jadi tidak bisa
 * "lupa" seperti prompt.
 */

/** Blok Unicode CJK: ideograf utama + ext-A + compat, fullwidth forms. */
const CJK_RE = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/g;

export interface SanitizeResult {
  text: string;
  /** jumlah karakter CJK yang dihapus/stripped */
  removed: number;
}

/**
 * Strip karakter CJK dari jawaban AI (drop, tanpa pengganti).
 * Kata gabungan seperti "喜庆banget" → "banget"; aman utk teks ID/EN.
 * Bukan solusi akar (model tetap bisa hallucinate) — akar ditutup di prompt;
 * ini jaring pengaman lapisan-2 agar CJK TIDAK PERNAH sampai ke UI.
 */
export function sanitizeAiText(text: string): SanitizeResult {
  if (!text) return { text, removed: 0 };
  let removed = 0;
  const out = text.replace(CJK_RE, () => {
    removed++;
    return "";
  });
  // rapikan sisa spasi ganda akibat strip
  const cleaned = out.replace(/[ \t]{2,}/g, " ");
  return { text: cleaned, removed };
}

/**
 * Guard aritmetika ASCII/angka dalam jawaban: bila ada pola angka menggantung
 * tanpa konteks, tidak diubah (doktrin angka-dari-DB tetap); fungsi ini hanya
 * untuk deteksi di flywheel/telemetri — placeholder v1, belum dipakai route.
 */
export function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}
