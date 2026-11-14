import { test } from "node:test";
import assert from "node:assert/strict";
import { splitMidArticle } from "../article-renderer";

// ux-2026-11-11-02 (PRD prd-2026-11-12-01) AC2: RelatedSignals mid-article —
// precisely AFTER the 2nd non-duplicate H2 heading (its following block),
// fallback after the 4th paragraph for 0/1-heading articles. Never page bottom.

const twoH2 = [
  "Paragraf intro pembuka artikel.",
  "",
  "## H2 Pertama",
  "Paragraf bawah H2 pertama.",
  "",
  "Paragraf kedua bawah H2 satu.",
  "",
  "## H2 Kedua",
  "Paragraf pembuka section kedua.",
  "",
  "Paragraf lanjutan section kedua.",
  "",
  "## H2 Ketiga",
  "Paragraf section tiga.",
].join("\n");

const fiveH2 = [
  "Intro.",
  "",
  "## Satu",
  "Isi satu.",
  "",
  "## Dua",
  "Isi dua pembuka.",
  "",
  "Isi dua lanjutan.",
  "",
  "## Tiga",
  "Isi tiga.",
  "",
  "## Empat",
  "Isi empat.",
  "",
  "## Lima",
  "Isi lima.",
].join("\n");

test("2-H2: split lands after the block following the 2nd H2 (not before, not section 3)", () => {
  const s = splitMidArticle(twoH2);
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("Paragraf pembuka section kedua."));
  assert.ok(!s.before.includes("Paragraf lanjutan section kedua"));
  assert.ok(s.after.startsWith("Paragraf lanjutan section kedua"));
});

test("5-H2: same rule — after 2nd H2's opening block, long tail stays in after", () => {
  const s = splitMidArticle(fiveH2);
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("Isi dua pembuka."));
  assert.ok(!s.before.includes("Isi dua lanjutan"));
  assert.ok(!s.before.includes("Isi tiga"));
  assert.ok(s.after.startsWith("Isi dua lanjutan"));
});

test("title-duplicate heading is not counted (PRD AC1: H2 kedua yang TIDAK duplikat judul)", () => {
  const content = [
    "## Judul Artikel",
    "Paragraf setelah judul duplikat.",
    "",
    "## H2 Nyata Pertama",
    "Isi pertama.",
    "",
    "## H2 Nyata Kedua",
    "Pembuka kedua.",
    "",
    "Sisa konten.",
  ].join("\n");
  const s = splitMidArticle(content, "Judul Artikel");
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("Pembuka kedua."));
  assert.ok(s.after.startsWith("Sisa konten."));
});

test("0-H2: fallback after 4th paragraph, not at bottom", () => {
  const content = [
    "P1.", "", "P2.", "", "P3.", "", "P4.", "", "P5.", "", "P6.",
  ].join("\n");
  const s = splitMidArticle(content);
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("P4."));
  assert.ok(s.after.startsWith("P5."));
});

test("1-H2: fallback after 4th paragraph as well", () => {
  const content = [
    "P1.", "", "## Satu-satunya", "P2.", "", "P3.", "", "P4.", "", "P5.", "", "P6.",
  ].join("\n");
  const s = splitMidArticle(content);
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("P4."));
  assert.ok(s.after.startsWith("P5."));
});

test("short article (<4 paragraphs, 0 heading): no mid slot (null) — module stays only at bottom", () => {
  const s = splitMidArticle("P1.\n\nP2.");
  assert.equal(s.insertAt, null);
  assert.equal(s.before, "P1.\n\nP2.");
  assert.equal(s.after, "");
});

test("2nd H2 is the LAST block: no mid slot (would equal page bottom)", () => {
  const content = [
    "Intro.", "", "## Satu", "Isi satu.", "", "## Dua Terakhir",
  ].join("\n");
  const s = splitMidArticle(content);
  assert.equal(s.insertAt, null);
});

test("fenced code: '#'-lines inside fences are not headings; fences survive intact", () => {
  const content = [
    "Intro.", "",
    "## Satu",
    "Sebelum kode.",
    "",
    "```python",
    "# bukan heading",
    "",
    "x = 1",
    "```",
    "",
    "## Dua",
    "Pembuka dua.",
    "",
    "Lanjutan dua.",
  ].join("\n");
  const s = splitMidArticle(content);
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("Pembuka dua."));
  assert.ok(s.after.startsWith("Lanjutan dua."));
  // fence intact in before
  assert.ok(s.before.includes("```python"));
  assert.ok(s.before.includes("# bukan heading"));
});

test("invariant: before + after === original content whenever insertAt !== null", () => {
  for (const c of [twoH2, fiveH2]) {
    const s = splitMidArticle(c);
    assert.notEqual(s.insertAt, null);
    assert.equal(s.before + s.after, c);
  }
});

test("raw-HTML article (old Sep-2026 format, <h2>/<p> per line): counts HTML headings, splits after 2nd", () => {
  const content = [
    "<p>Brief pagi sebelum pasar buka: rekap sesi Senin.</p>",
    "<h2>Sesi kemarin: tekanan masih dominan</h2>",
    "<p>Sesi Senin (28/9) masih merah: dari 866 saham berdata lengkap.</p>",
    "<h2>GOTO: 11 sesi membeku di Rp50</h2>",
    "<p>Inilah cerita terbesar kemarin. GOTO ditutup Rp43 turun 14 persen.</p>",
    "<h2>Miner tembaga-nikel ikut terkoreksi</h2>",
    "<p>Sektor tambang melemah mengikuti sentimen komoditas.</p>",
  ].join("\n");
  const s = splitMidArticle(content, "GOTO Jatuh 14% — Brief Pasar IDX");
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("GOTO: 11 sesi membeku"));
  assert.ok(s.before.includes("Rp43 turun 14 persen"));
  assert.ok(s.after.startsWith("<h2>Miner tembaga-nikel"));
  assert.equal(s.before + s.after, content);
});

test("raw-HTML: title-duplicate <h2> is not counted (uses tag-stripped text)", () => {
  const content = [
    "<p>Intro paragraf.</p>",
    "<h2>GOTO Jatuh 14% ke Rp43 — Brief Pasar IDX</h2>",
    "<p>Paragraf setelah judul duplikat.</p>",
    "<h2>Heading Nyata Pertama</h2>",
    "<p>Isi pertama.</p>",
    "<h2>Heading Nyata Kedua</h2>",
    "<p>Pembuka kedua.</p>",
    "<p>Sisa konten.</p>",
  ].join("\n");
  const s = splitMidArticle(content, "GOTO Jatuh 14% ke Rp43 — Brief Pasar IDX");
  assert.notEqual(s.insertAt, null);
  assert.ok(s.before.includes("Pembuka kedua."));
  assert.ok(s.after.startsWith("<p>Sisa konten.</p>"));
});
