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

/**
 * Guard disclaimer compliance — lapis-2 deterministik (doktrin anti-mislead).
 *
 * Latar (loop 9 Nov): aturan prompt "akhiri disclaimer bukan rekomendasi"
 * bisa DILEWATI model — kasus nyata: jawaban preset syariah berakhir di
 * [FOLLOWUPS] tanpa satu kalimat disclaimer pun, padahal 9/10 jawaban lain
 * patuh. Compliance tidak boleh bergantung kepatuhan model.
 */
export const AI_DISCLAIMER = "Data teknikal ya, bukan rekomendasi beli/jual.";

/** Varian frasa non-rekomendasi yang sudah dihitung memenuhi compliance. */
const DISCLAIMER_RE = /bukan\s+(?:rekomendasi|saran|ajakan|anjuran)|bukanlah\s+(?:rekomendasi|saran|ajakan)/i;

/**
 * Pastikan jawaban AI memuat kalimat non-rekomendasi. Sudah ada → teks utuh.
 * Belum ada → sisipkan SEBELUM trailer [FOLLOWUPS] (bila ada) agar disclaimer
 * tampil di badan jawaban, bukan setelah chip follow-up.
 */
export function ensureAiDisclaimer(text: string): string {
  if (!text || DISCLAIMER_RE.test(text)) return text;
  const fIdx = text.lastIndexOf("[FOLLOWUPS]");
  if (fIdx === -1) return `${text}\n\n${AI_DISCLAIMER}`;
  const head = text.slice(0, fIdx).trimEnd();
  const tail = text.slice(fIdx);
  return `${head}\n\n${AI_DISCLAIMER}\n\n${tail}`;
}

/**
 * Guard konsistensi format ticker — lapis-3 deterministik (loop 11 Nov).
 *
 * Latar (eval 11 Nov, g05 skor 7,33 = terendah): prompt screener WAJIB meminta
 * semua ticker sebagai Markdown link [TICKER](/stocks/TICKER.JK), tapi model
 * kadang hanya **bold** sebagian ticker (AMRT/CBUT/DNET bold tanpa link,
 * berdampingan dengan AKPI/BBRI berlink) — campuran format dinilai turun juri.
 * Kepatuhan format tidak boleh bergantung kepatuhan model.
 *
 * Aturan aman: hanya ticker yang ADA di data server (allowlist, diekstrak
 * rekursif dari context/stocks) yang di-linkify — kata lain ber-bold seperti
 * **BELI**, **IHSG**, **RSI** tidak pernah disentuh; link yang sudah ada
 * dibiarkan utuh.
 */

/** Kumpulkan ticker (4 huruf kapital, .JK optional) dari nilai string nested apa pun. */
function collectTickers(o: unknown, out: Set<string>): void {
  if (!o) return;
  if (Array.isArray(o)) {
    for (const v of o) collectTickers(v, out);
    return;
  }
  if (typeof o === "object") {
    for (const v of Object.values(o as Record<string, unknown>)) collectTickers(v, out);
    return;
  }
  if (typeof o === "string") {
    const s = o.replace(/\.JK$/i, "").trim();
    if (/^[A-Z]{4}$/.test(s)) out.add(s);
  }
}

const BOLD_TICKER_RE = /\*\*([A-Z]{4})\*\*/g;

/**
 * Ubah **TICKER** (hanya yang ada di allowlist data server) menjadi
 * [TICKER](/stocks/TICKER.JK). Text kosong → tetap kosong.
 */
export function linkifyBoldTickers(text: string, source: unknown): string {
  if (!text) return text;
  const allow = new Set<string>();
  collectTickers(source, allow);
  if (allow.size === 0) return text;
  return text.replace(BOLD_TICKER_RE, (whole, t: string) =>
    allow.has(t) ? `[${t}](/stocks/${t}.JK)` : whole,
  );
}

/**
 * Guard konsistensi satuan — lapis-4 deterministik (loop 16 Nov).
 *
 * Latar: glosarium prompt "asing = 'Rp X miliar' (bukan 'M')" SUDAH ada di
 * kedua route sejak juri Claude 30 Okt, tapi eval 16 Nov masih menangkap
 * "Rp57,64 M" / "Rp65,6 M" bersebelahan "Rp274,51 miliar" di kalimat yang
 * SAMA (eval #4 & #9) — kepatuhan satuan tidak boleh bergantung kepatuhan
 * model (preseden: disclaimer loop 9 Nov, linkify loop 11 Nov).
 *
 * Hanya pola uang `Rp<angka> M` yang disentuh → "miliar". Tanpa prefix "Rp"
 * tidak disentuh (volume "57,64 M lembar" dll aman); "M" yang menempel kata
 * lain (mis. "Market") tidak match karena word-boundary.
 */
const RUPIAH_M_RE = /(Rp\s?\d[\d.]*(?:,\d+)?)\s?M\b/g;

export function normalizeUnit(text: string): string {
  if (!text) return text;
  return text.replace(RUPIAH_M_RE, (_whole, num: string) => `${num} miliar`);
}

/**
 * Guard framing chip follow-up — lapis-5 deterministik (loop 17 Nov).
 *
 * Latar (juri 16 Nov): chip [FOLLOWUPS] condong ajakan transaksi —
 * "layak dibeli?" / "layak dikumpul?" dinilai judge melanggar framing netral
 * (doktrin anti-mislead: TIDAK PERNAH mengajak beli/jual). Kepatuhan framing
 * tidak boleh bergantung kepatuhan model (preseden: disclaimer lapis-2,
 * linkify lapis-3, satuan lapis-4).
 *
 * Hanya bagian SETELAH marker [FOLLOWUPS] yang disentuh — badan jawaban utuh.
 * Chip ber-framing transaksi diganti chip netral dari pool (berurutan, anti
 * duplikat). Pertanyaan FAKTUAL yang kebetulan memuat kata beli/jual
 * ("Asing beli saham apa?") TIDAK disentuh — pola hanya cocokkan chip yang
 * MEMINTA keputusan transaksi (layak/ harus / saatnya + verb).
 */

const FOLLOWUPS_SPLIT_RE = /(\n?\*{0,2}\[FOLLOW\s?UPS?\]\*{0,2}[\s:]*)/i;

/** Chip yang meminta keputusan beli/jual (bukan pertanyaan faktual). */
const BUYISH_CHIP_RE =
  /\b(?:layak|harus|saatnya?|waktunya|kapan|gimana|ganti|mulai|cocok)\b[^|]*\b(?:dibeli|dikumpul|diakumulasi|beli|kumpul|buy|jual|akumulasi|exit|cutloss|cut loss|sell)\b|\b(?:beli|buy|jual|sell)\b[^|]*\b(?:sekarang|nih|dong|ya\?|ga\?|gak\?)\b|\b(?:beli|jual|buy|sell)\s*\?/i;

const NEUTRAL_CHIP_POOL = [
  "Apa risiko utama yang perlu dipantau?",
  "Bagaimana tren jangka pendeknya?",
  "Apa pemicu utama pergerakan ini?",
];

export function neutralizeFollowupFraming(text: string): string {
  if (!text) return text;
  const m = text.match(FOLLOWUPS_SPLIT_RE);
  if (!m) return text;
  const idx = text.indexOf(m[0]);
  const head = text.slice(0, idx);
  let tail = text.slice(idx + m[0].length);
  let poolIdx = 0;
  tail = tail
    .split(/\n|\||\/|;|\batau\b/i)
    .map((chip) => {
      const trimmed = chip.trim();
      if (!trimmed || !BUYISH_CHIP_RE.test(trimmed)) return chip;
      const replacement = NEUTRAL_CHIP_POOL[poolIdx % NEUTRAL_CHIP_POOL.length];
      poolIdx++;
      return chip.replace(trimmed, replacement);
    })
    .join("|");
  return `${head}${m[0]}${tail}`;
}
