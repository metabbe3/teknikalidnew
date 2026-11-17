import { test } from "node:test";
import assert from "node:assert";
import { sanitizeAiText, hasCjk, ensureAiDisclaimer, linkifyBoldTickers } from "./ai-sanitize";

test("strip CJK dari teks Indonesia", () => {
  const r = sanitizeAiText("Market lagi喜庆 banget nih — IHSG naik.");
  assert.equal(r.removed, 2);
  assert.equal(r.text.includes("喜庆"), false);
  assert.equal(r.text.includes("banget"), true);
  assert.equal(hasCjk(r.text), false);
});

test("teks bersih tidak berubah", () => {
  const t = "Close 5 Nov: BBCA naik +2,25% ke Rp5.030, volume 1,2 juta lembar.";
  const r = sanitizeAiText(t);
  assert.equal(r.removed, 0);
  assert.equal(r.text, t);
});

test("kata gabungan CJK+Latin tetap utuh setelah strip", () => {
  const r = sanitizeAiText("harga喜庆naik terus bro");
  assert.equal(r.removed, 2);
  assert.equal(r.text.includes("harga"), true);
  assert.equal(r.text.includes("naik terus bro"), true);
});

test("CJK berbagai blok terdeteksi (hiragana/fullwidth)", () => {
  assert.equal(hasCjk("テスト"), true);
  assert.equal(hasCjk("ＡＢＣ"), true);
  assert.equal(hasCjk("ini biasa saja"), false);
});

test("string kosong aman", () => {
  const r = sanitizeAiText("");
  assert.equal(r.removed, 0);
  assert.equal(r.text, "");
});

// ─── ensureAiDisclaimer (loop 9 Nov): guard compliance deterministik ───
test("disclaimer hilang → disisipkan sebelum [FOLLOWUPS]", () => {
  const t = "Skor teknikal CDIA positif, sisanya melemah.\n\n[FOLLOWUPS] Skor dihitung gimana? | AMRT kenapa turun?";
  const r = ensureAiDisclaimer(t);
  assert.equal(r.includes("bukan rekomendasi"), true);
  assert.equal(r.indexOf("bukan rekomendasi") < r.indexOf("[FOLLOWUPS]"), true);
  assert.equal(r.includes("[FOLLOWUPS] Skor dihitung gimana?"), true);
});

test("disclaimer sudah ada → tidak diduplikasi", () => {
  const t = "Asing net buy BBCA Rp524 miliar (close 9 Nov). Data teknikal ya, bukan rekomendasi beli.\n\n[FOLLOWUPS] Kenapa asing pilih BBCA? | ASII kenapa diborong? | BMRI kenapa dilepas?";
  const r = ensureAiDisclaimer(t);
  assert.equal((r.match(/bukan rekomendasi/g) ?? []).length, 1);
  assert.equal(r, t);
});

test("tanpa [FOLLOWUPS] → disclaimer di akhir teks", () => {
  const r = ensureAiDisclaimer("IHSG close 9 Nov naik 0,46% ke 5.073,77.");
  assert.equal(r.endsWith("bukan rekomendasi beli/jual."), true);
});

test("string kosong → tetap kosong (guard tidak menulis tanpa jawaban)", () => {
  assert.equal(ensureAiDisclaimer(""), "");
});

// ─── linkifyBoldTickers (loop 11 Nov): konsistensi format ticker ───
test("bold ticker di allowlist data server → link", () => {
  const stocks = [
    { ticker: "AMRT", close: 960 },
    { ticker: "CBUT.JK", signalScore: 0.53 },
  ];
  const t = "Yang menonjol: **AMRT** naik 3,23% dan **CBUT** skor tertinggi.";
  const r = linkifyBoldTickers(t, stocks);
  assert.equal(r.includes("[AMRT](/stocks/AMRT.JK)"), true);
  assert.equal(r.includes("[CBUT](/stocks/CBUT.JK)"), true);
  assert.equal(r.includes("**AMRT**"), false);
});

test("bold kata non-ticker (BELI/IHSG) TIDAK disentuh walau tidak di allowlist", () => {
  const t = "Jangan **BELI** sekarang, **IHSG** masih merah, lihat **RSI** dulu.";
  const r = linkifyBoldTickers(t, [{ ticker: "BBCA" }]);
  assert.equal(r, t);
});

test("bold ticker yang TIDAK ada di data server → dibiarkan bold (anti mengarang)", () => {
  const t = "**AMRT** ada di data, **ZZZZ** tidak.";
  const r = linkifyBoldTickers(t, [{ ticker: "AMRT" }]);
  assert.equal(r.includes("[AMRT](/stocks/AMRT.JK)"), true);
  assert.equal(r.includes("**ZZZZ**"), true);
});

test("link yang sudah ada tidak diproses ulang / tidak dobel", () => {
  const t = "Awal: **BBCA** dan sudah link [BBRI](/stocks/BBRI.JK).";
  const r = linkifyBoldTickers(t, { ticker: "BBCA.JK", DATA_PERBANDINGAN: { ticker: "BBRI.JK" } });
  assert.equal(r.includes("[BBCA](/stocks/BBCA.JK)"), true);
  assert.equal((r.match(/\[BBRI\]\(\/stocks\/BBRI\.JK\)/g) ?? []).length, 1);
});

test("string kosong → tetap kosong", () => {
  assert.equal(linkifyBoldTickers("", [{ ticker: "BBCA" }]), "");
});

test("allowlist kosong → teks utuh tanpa perubahan", () => {
  const t = "ini **teks** biasa tanpa ticker.";
  assert.equal(linkifyBoldTickers(t, { foo: "bar" }), t);
});

// ─── normalizeUnit (loop 16 Nov): konsistensi satuan "M" → "miliar" ───
import { normalizeUnit } from "./ai-sanitize";

test("Rp X M → Rp X miliar (kasus nyata eval #9)", () => {
  const t = "list (Rp57,64 M dan Rp56,68 M) — ANTM keluar";
  const r = normalizeUnit(t);
  assert.equal(r.includes("Rp57,64 miliar"), true);
  assert.equal(r.includes("Rp56,68 miliar"), true);
  assert.equal(r.includes(" M"), false);
});

test("desimal tunggal Rp65,6 M → miliar (eval #4)", () => {
  assert.equal(normalizeUnit("nilai Rp65,6 M saja"), "nilai Rp65,6 miliar saja");
});

test("campuran miliar + M dalam kalimat sama → jadi konsisten", () => {
  const t = "BBRI Rp274,51 miliar, GOTO Rp57,64 M.";
  const r = normalizeUnit(t);
  assert.equal(r, "BBRI Rp274,51 miliar, GOTO Rp57,64 miliar.");
});

test("tanpa prefix Rp → tidak disentuh (volume lembar aman)", () => {
  const t = "volume 57,64 M lembar tadi.";
  assert.equal(normalizeUnit(t), t);
});

test("'M' menempel kata lain (Market) → tidak disentuh", () => {
  const t = "Rp5 Miliar sudah oke, Market cap besar";
  assert.equal(normalizeUnit(t), t);
});

test("sudah 'miliar' → utuh (idempotent)", () => {
  const t = "net buy Rp274,51 miliar.";
  assert.equal(normalizeUnit(t), t);
});

test("string kosong → tetap kosong", () => {
  assert.equal(normalizeUnit(""), "");
});

// ─── neutralizeFollowupFraming (loop 17 Nov): chip [FOLLOWUPS] netral ───
import { neutralizeFollowupFraming } from "./ai-sanitize";

test("chip 'layak dibeli?' → diganti chip netral (kasus juri 16 Nov)", () => {
  const t = "RSI BBCA 52,94 netral.\n\nData teknikal ya, bukan rekomendasi beli/jual.\n\n[FOLLOWUPS] Layak dibeli? | Kenapa RSI-nya netral? | Support di mana?";
  const r = neutralizeFollowupFraming(t);
  assert.equal(/layak dibeli/i.test(r), false);
  assert.equal(r.includes("Apa risiko utama yang perlu dipantau?"), true);
  assert.equal(r.includes("Kenapa RSI-nya netral?"), true); // chip netral utuh
  assert.equal(r.includes("[FOLLOWUPS]"), true);
});

test("chip 'layak dikumpul' + 'waktunya jual' → dua-duanya diganti, chip faktual utuh", () => {
  const t = "[FOLLOWUPS] Layak dikumpul perlahan? | Sudah waktunya jual? | Emisi obligasi kapan?";
  const r = neutralizeFollowupFraming(t);
  assert.equal(/dikumpul/i.test(r), false);
  assert.equal(/waktunya jual/i.test(r), false);
  assert.equal(r.includes("Bagaimana tren jangka pendeknya?"), true);
  assert.equal(r.includes("Emisi obligasi kapan?"), true); // faktual → tidak disentuh
});

test("pertanyaan faktual 'Asing beli saham apa?' → TIDAK disentuh", () => {
  const t = "[FOLLOWUPS] Asing beli saham apa kemarin? | Kenapa BBRI diborong? | IHSG naik berapa?";
  assert.equal(neutralizeFollowupFraming(t), t);
});

test("tanpa [FOLLOWUPS] → teks utuh", () => {
  const t = "Layak dibeli? tanpa marker apapun.";
  assert.equal(neutralizeFollowupFraming(t), t);
});

test("badan jawaban yang menyebut 'layak beli' tetap utuh (hanya chip disentuh)", () => {
  const t = "Kalau kriterianya terpenuhi baru dipertimbangkan layak beli.\n\n[FOLLOWUPS] Layak dibeli sekarang? | RSI artinya apa?";
  const r = neutralizeFollowupFraming(t);
  assert.equal(r.startsWith("Kalau kriterianya terpenuhi baru dipertimbangkan layak beli."), true);
  assert.equal(/Layak dibeli sekarang/.test(r), false);
});
