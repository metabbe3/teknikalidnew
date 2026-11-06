import { test } from "node:test";
import assert from "node:assert";
import { sanitizeAiText, hasCjk } from "./ai-sanitize";

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
