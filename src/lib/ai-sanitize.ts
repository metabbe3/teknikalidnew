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
 * Lapisan repair format ticker (loop 19 Nov) — dua kegagalan emit model yang
 * lolos dari regex pasangan-penuh di atas:
 * (1) bold rusak: `**TICKER](/stocks/TICKER.JK)` (bracket pembuka hilang) —
 *     tampil sebagai asterisk mentah + link mati di jawaban (battery 19 Nov
 *     gibberish: 3× dalam 1 jawaban);
 * (2) dobel: `**TICKER** [TICKER](/stocks/TICKER.JK)` — bold + link bersebelahan
 *     utk ticker sama (battery 19 Nov "IHSG kenapa turun").
 * Keduanya hanya diperbaiki bila ticker ada di allowlist data server —
 * ticker/kata tak dikenal dibiarkan apa adanya (anti mengarang).
 */
const BROKEN_BOLD_LINK_RE = /\*\*([A-Z]{4})\]\(\/stocks\/\1\.JK\)/g;
const BOLD_PLUS_LINK_RE = /\*\*([A-Z]{4})\*\*\s*(?=\[\1\]\(\/stocks\/\1\.JK\))/g;

/**
 * Ubah **TICKER** (hanya yang ada di allowlist data server) menjadi
 * [TICKER](/stocks/TICKER.JK). Text kosong → tetap kosong.
 */
export function linkifyBoldTickers(text: string, source: unknown): string {
  if (!text) return text;
  const allow = new Set<string>();
  collectTickers(source, allow);
  if (allow.size === 0) return text;
  // Repair dulu (lapis 19 Nov), baru linkify pasangan-penuh — urutan penting:
  // repair bold-rusak mencegah asterisk mentah lolos ke FE, strip bold-dobel
  // harus SEBELUM pasangan-penuh mengganti `**TICKER**` jadi link kedua.
  const repaired = text
    .replace(BROKEN_BOLD_LINK_RE, (_w, t: string) =>
      allow.has(t) ? `[${t}](/stocks/${t}.JK)` : _w,
    )
    .replace(BOLD_PLUS_LINK_RE, (_w, t: string) => (allow.has(t) ? "" : _w));
  return repaired.replace(BOLD_TICKER_RE, (whole, t: string) =>
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

// ── Loop 18 Nov (lapis-7): enforceKeyLevels ──────────────────────────────────
// Dua bug eval 18 Nov yang lolos semua guard lama (model tetap bisa salah-tulis
// angka kritis walau context benar):
//   (a) digit-drop level kunci: "support 1.350" padahal context Rp3.350;
//   (b) relasi arah SMA terbalik: "di bawah SMA50 (Rp5.708)" padahal close 5.750.
// Kelas sama dgn bug sign-flip IHSG 12 Nov: angka berarah harus diverifikasi
// deterministik dari data server, bukan dipercaya ke model.

export interface KeyLevelDatum {
  ticker?: string;
  name?: string;
  close?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  support1?: number | null;
  resistance1?: number | null;
  support?: number | null;
  resistance?: number | null;
  [key: string]: unknown;
}

function parseIdn(raw: string): number | null {
  const v = parseFloat(String(raw).replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(v) ? v : null;
}

function fmtRp(v: number): string {
  return "Rp" + Math.round(v).toLocaleString("id-ID");
}

const SR_WORD_RE = /\b(support|resistance)\b/gi;
const IDN_NUM_RE = /(?:Rp\s?)?(\d{1,3}(?:\.\d{3})+|\d{3,7})(?:,\d{1,3})?/g;
const SMA_REL_RE =
  /\b(di\s+(?:atas|bawah))\s+(SMA(?:20|50|200))\s*(?:\((?:Rp\s?)?([\d.,]+)\)|(?:Rp\s?)?([\d.,]+))/gi;

/** Batas kalimat: titik di antara dua digit = pemisah ribuan/desimal, BUKAN akhir kalimat. */
function sentenceSpan(text: string, idx: number): [number, number] {
  let s = 0;
  for (let i = idx - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "\n" || ch === "!" || ch === "?") { s = i + 1; break; }
    if (ch === "." && !/\d/.test(text[i - 1] ?? "") && !/\d/.test(text[i + 1] ?? "")) { s = i + 1; break; }
  }
  let e = text.length;
  for (let i = idx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n" || ch === "!" || ch === "?") { e = i; break; }
    if (ch === "." && !/\d/.test(text[i - 1] ?? "") && !/\d/.test(text[i + 1] ?? "")) { e = i; break; }
  }
  return [s, e];
}

function smaField(smaName: string): "sma20" | "sma50" | "sma200" {
  return smaName === "SMA20" ? "sma20" : smaName === "SMA50" ? "sma50" : "sma200";
}

/** (a) Bangun ulang angka support/resistance yang digit-nya korup dari data server. */
function repairSrDigits(text: string, stocks: KeyLevelDatum[]): string {
  const hits: Array<{ s: number; e: number; rep: string }> = [];
  SR_WORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SR_WORD_RE.exec(text))) {
    // jendela kalimat sekitar kata support/resistance (titik-dalam-angka bukan batas)
    const [sStart, sEnd] = sentenceSpan(text, m.index);
    const sent = text.slice(sStart, sEnd);
    // pilih saham utk kalimat ini: ticker disebut eksplisit, atau cuma ada 1 kandidat
    const mentioned = stocks.filter(
      (d) =>
        (d.ticker && sent.toUpperCase().includes(String(d.ticker).replace(/\.JK/i, "").toUpperCase())) ||
        (d.name && sent.toLowerCase().includes(String(d.name).toLowerCase())),
    );
    const d = mentioned.length === 1 ? mentioned[0] : mentioned.length === 0 && stocks.length === 1 ? stocks[0] : null;
    if (!d) continue;
    const sup = parseIdn(String(d.support1 ?? d.support ?? ""));
    const res = parseIdn(String(d.resistance1 ?? d.resistance ?? ""));
    if (!sup && !res) continue;
    // angka Rp-prefixed di kalimat = sehat; jadi acuan "dekat"
    const legit: number[] = (sent.match(/Rp\s?\d[\d.,]*/g) ?? [])
      .map((w) => parseIdn(w.replace(/^Rp\s?/, "")))
      .filter((v): v is number => v !== null && v > 0);
    IDN_NUM_RE.lastIndex = 0;
    let n: RegExpExecArray | null;
    while ((n = IDN_NUM_RE.exec(sent))) {
      const tok = n[0];
      if (/Rp/.test(tok)) continue; // Rp-prefixed = ditulis sehat
      const val = parseIdn(n[1]);
      if (val === null) continue;
      const after = sent.slice(n.index + tok.length, n.index + tok.length + 2);
      const before = sent.slice(Math.max(0, n.index - 1), n.index);
      if (after.startsWith("%") || /^[+\-/]/.test(before)) continue; // persen/skor bertanda
      if (val >= 1900 && val <= 2099) continue; // tahun
      if (legit.some((v) => Math.abs(v - val) <= val * 0.12)) continue; // sudah dekat nilai sah
      // rekonstruksi: SATU nilai S/R konteks di rentang wajar [0.45×, 2.6×]
      const band = (v: number) => v >= val * 0.45 && v <= val * 2.6;
      const inSup = sup ? band(sup) : false;
      const inRes = res ? band(res) : false;
      const pick = inSup && inRes ? (/resist/i.test(sent.slice(Math.max(0, n.index - 40), n.index)) ? res : sup) : inSup ? sup : inRes ? res : null;
      if (pick === null) continue;
      hits.push({ s: sStart + n.index, e: sStart + n.index + tok.length, rep: fmtRp(pick) });
    }
  }
  // dedupe: SR_WORD_RE bisa match beberapa kata di kalimat sama → token sama ter-scan berulang
  const seen = new Set<number>();
  for (const h of hits.sort((a, b) => b.s - a.s)) {
    if (seen.has(h.s)) continue;
    seen.add(h.s);
    text = text.slice(0, h.s) + h.rep + text.slice(h.e);
  }
  return text;
}

/** (b) Relasi close-vs-SMA ditegakkan dari angka: "di bawah SMA (RpX)" padahal close > X → dibalik. */
function fixSmaRelations(text: string, stocks: KeyLevelDatum[]): string {
  const fixes: Array<{ s: number; e: number; rep: string }> = [];
  SMA_REL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SMA_REL_RE.exec(text))) {
    const rel = m[1].toLowerCase();
    const smaName = m[2];
    const val = parseIdn(m[3] ?? m[4] ?? "");
    if (val === null || val <= 0) continue;
    // ground ke saham yang SMA-nya cocok dgn angka disebut (aman utk jawaban compare 2 saham)
    const d = stocks.find((s) => {
      const sv = Number((s as Record<string, unknown>)[smaField(smaName)]);
      return Number.isFinite(sv) && sv > 0 && Math.abs(sv - val) <= val * 0.005;
    });
    if (!d) continue;
    const close = Number(d.close);
    if (!Number.isFinite(close) || close <= 0) continue;
    if (Math.abs(close - val) <= val * 0.005) continue; // sekitar sama → biarkan
    const closeAbove = close > val;
    if (rel.includes("bawah") && closeAbove) fixes.push({ s: m.index, e: m.index + m[1].length, rep: "di atas" });
    else if (rel.includes("atas") && !closeAbove) fixes.push({ s: m.index, e: m.index + m[1].length, rep: "di bawah" });
  }
  for (const f of fixes.sort((a, b) => b.s - a.s)) {
    text = text.slice(0, f.s) + f.rep + text.slice(f.e);
  }
  return text;
}

export function enforceKeyLevels(text: string, data: unknown): string {
  if (!text) return text;
  const stocks: KeyLevelDatum[] = Array.isArray(data) ? (data as KeyLevelDatum[]) : data ? [data as KeyLevelDatum] : [];
  let out = repairSrDigits(text, stocks);
  out = fixSmaRelations(out, stocks);
  return out;
}
