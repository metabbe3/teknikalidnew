import { test } from "node:test";
import assert from "node:assert";
import { sanitizeAiText, hasCjk, ensureAiDisclaimer } from "./ai-sanitize";

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
