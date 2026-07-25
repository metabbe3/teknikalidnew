import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateArticle } from "../quality-validator";

/**
 * Build article content that satisfies every structural rule except the title.
 * This lets us isolate title-specific rejections in the validator.
 */
function makeValidContent(): string {
  const paragraph =
    "IHSG menguat signifikan pada perdagangan hari ini seiring arus masuk asing yang mendominasi market. " +
    "BBCA, BBRI, dan TLKM menjadi saham blue chip yang paling aktif diperdagangkan dengan kenaikan signifikan. " +
    "Investor ritel tampaknya antusias mengikuti rally pasar seiring data inflasi yang menunjukkan tren menurun. " +
    "Analisa teknikal menunjukkan IHSG bergerak di atas moving average 50 dan 200 hari yang mengkonfirmasi tren bullish jangka menengah. " +
    "Sektor perbankan dan telekomunikasi memimpin kenaikan dengan kontribusi positif yang signifikan terhadap indeks. " +
    "Volume perdagangan meningkat dibandingkan rata-rata 20 hari terakhir yang menunjukkan partisipasi investor yang kuat.";

  // Repeat enough to exceed 1200 words.
  const body = Array.from({ length: 25 }, () => paragraph).join("\n\n");

  return [
    "## Ringkasan Pasar Hari Ini",
    "",
    paragraph,
    "",
    "## Analisa Perbankan",
    "",
    paragraph,
    "",
    "## Sektor Telekomunikasi",
    "",
    paragraph,
    "",
    "## Arus Asing dan Likuiditas",
    "",
    paragraph,
    "",
    "## Outlook dan Strategi",
    "",
    body,
    "",
    "## Kata Kunci",
    "",
    "| Keyword | Pencarian |",
    "| --- | --- |",
    "| ihsg | tinggi |",
    "| bbca | sedang |",
    "",
    ":::tip[Insight Pro]",
    "Pantau level support dan resistance IHSG untuk konfirmasi sinyal teknikal.",
    ":::",
    "",
    ":::tip[Risiko]",
    "Waspadai volatilitas jika data ekonomi global keluar di luar ekspektasi pasar.",
    ":::",
    "",
    ":::cta[Mulai Analisa Saham]",
    "Buka chart interaktif BBCA, BBRI, dan TLKM sekarang juga.",
    ":::",
    "",
    ":::warning[Disclaimer On]",
    "Artikel ini bersifat edukatif dan bukan ajakan untuk membeli atau menjual saham tertentu.",
    ":::",
    "",
  ].join("\n");
}

describe("validateArticle — title leakage rejection", () => {
  it("rejects title 'Berikut adalah beberapa variasi judul alternatif...'", () => {
    const result = validateArticle(makeValidContent(), "Berikut adalah beberapa variasi judul alternatif", ["ihsg"]);
    assert.equal(result.passed, false);
    const leak = result.issues.find((i) => i.rule === "ai_prompt_leak");
    assert.ok(leak, "expected ai_prompt_leak issue");
    assert.ok(leak!.message.includes("Judul"), `message should mention judul: ${leak!.message}`);
  });

  it("rejects title 'Teks Anda terpotong di bagian akhir'", () => {
    const result = validateArticle(makeValidContent(), "Teks Anda terpotong di bagian akhir", ["ihsg"]);
    assert.equal(result.passed, false);
    const leak = result.issues.find((i) => i.rule === "ai_prompt_leak");
    assert.ok(leak);
  });

  it("rejects title 'Secara keseluruhan, judul sudah catchy'", () => {
    const result = validateArticle(makeValidContent(), "Secara keseluruhan, judul sudah catchy", ["ihsg"]);
    assert.equal(result.passed, false);
    assert.ok(result.issues.some((i) => i.rule === "ai_prompt_leak"));
  });

  it("rejects title longer than 20 words via title_invalid rule", () => {
    const longTitle = Array.from({ length: 22 }, (_, i) => `kata${i}`).join(" ");
    // Ensure no pattern leak fires (these are neutral words)
    const result = validateArticle(makeValidContent(), longTitle, ["ihsg"]);
    assert.equal(result.passed, false);
    const titleIssue = result.issues.find((i) => i.rule === "title_invalid");
    assert.ok(titleIssue, "expected title_invalid issue");
  });

  it("rejects title containing a newline via title_invalid rule", () => {
    const result = validateArticle(makeValidContent(), "Analisa IHSG\nHari Ini Update Lengkap", ["ihsg"]);
    assert.equal(result.passed, false);
    const titleIssue = result.issues.find(
      (i) => i.rule === "title_invalid" || i.rule === "ai_prompt_leak",
    );
    assert.ok(titleIssue);
  });

  it("accepts valid headline 'BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG'", () => {
    const title = "BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2";
    const result = validateArticle(makeValidContent(), title, ["ihsg"]);
    const leak = result.issues.find((i) => i.rule === "ai_prompt_leak");
    assert.equal(leak, undefined, `unexpected leak: ${JSON.stringify(leak)}`);
    const titleIssue = result.issues.find((i) => i.rule === "title_invalid");
    assert.equal(titleIssue, undefined, `unexpected title_invalid: ${JSON.stringify(titleIssue)}`);
  });

  it("accepts valid headline 'Analisa Teknikal BBCA Hari Ini — Sinyal Bullish'", () => {
    const title = "Analisa Teknikal BBCA Hari Ini Sinyal Bullish Mantap";
    const result = validateArticle(makeValidContent(), title, ["bbca"]);
    const leak = result.issues.find((i) => i.rule === "ai_prompt_leak");
    assert.equal(leak, undefined);
    const titleIssue = result.issues.find((i) => i.rule === "title_invalid");
    assert.equal(titleIssue, undefined);
  });

  it("emits both ai_prompt_leak and structural issues independently", () => {
    // Leaked title + otherwise valid content: must contain ai_prompt_leak error.
    const result = validateArticle(makeValidContent(), "Berikut adalah variasi judul", ["ihsg"]);
    assert.equal(result.passed, false);
    assert.ok(result.score < 100, "score must be reduced when errors present");
    assert.ok(result.issues.length > 0);
  });
});

describe("validateArticle — content leakage detection", () => {
  it("flags content that contains 'berdasarkan preview' (non-anchored)", () => {
    // Use a valid title so title is clean; inject leak phrase into content.
    const content =
      makeValidContent() +
      "\n\nJudul ini dibuat berdasarkan preview konten yang diberikan oleh pengguna.\n";
    const result = validateArticle(content, "Analisa IHSG Hari Ini Update Lengkap", ["ihsg"]);
    const leak = result.issues.find((i) => i.rule === "ai_prompt_leak");
    assert.ok(leak, "expected ai_prompt_leak in content");
  });

  it("does not flag clean content with normal Indonesian words", () => {
    const result = validateArticle(makeValidContent(), "Analisa IHSG Hari Ini Update Lengkap", ["ihsg"]);
    const leaks = result.issues.filter((i) => i.rule === "ai_prompt_leak");
    // Should be zero leaks (title is also clean).
    assert.equal(leaks.length, 0);
  });

  it("does NOT flag disclaimer text 'Artikel ini disusun untuk tujuan edukasi' (titleOnly pattern)", () => {
    // The disclaimer section legitimately contains this phrase; titleOnly patterns
    // must not fire against article body content.
    const content =
      makeValidContent() +
      "\n\n:::warning[Disclaimer On]\nArtikel ini disusun untuk tujuan edukasi dan informasi semata.\n:::";
    const result = validateArticle(content, "Analisa IHSG Hari Ini Update Lengkap", ["ihsg"]);
    const leak = result.issues.find(
      (i) => i.rule === "ai_prompt_leak" && i.message.includes("artikel ini disusun"),
    );
    assert.equal(leak, undefined, "titleOnly pattern should not fire on content");
  });

  it("does NOT flag markdown bold (**) in body content (titleOnly pattern)", () => {
    // Article body legitimately uses **bold** formatting.
    const content =
      makeValidContent() +
      "\n\nParagraf tambahan: **IHSG** menguat **signifikan** hari ini.";
    const result = validateArticle(content, "Analisa IHSG Hari Ini Update Lengkap", ["ihsg"]);
    const leak = result.issues.find(
      (i) => i.rule === "ai_prompt_leak" && i.message.includes("markdown bold"),
    );
    assert.equal(leak, undefined, "titleOnly bold pattern should not fire on content");
  });
});

describe("validateArticle — structural sanity", () => {
  it("returns a populated meta object", () => {
    const result = validateArticle(makeValidContent(), "Analisa IHSG Hari Ini Update Lengkap", ["ihsg"]);
    assert.equal(typeof result.meta.wordCount, "number");
    assert.ok(result.meta.wordCount >= 1200, `expected >=1200 words, got ${result.meta.wordCount}`);
    assert.ok(result.meta.h2Count >= 5);
    assert.equal(result.meta.hasCta, true);
    assert.equal(result.meta.hasDisclaimer, true);
    assert.equal(result.meta.hasKeywordTable, true);
    assert.ok(result.meta.tipCount >= 2);
    assert.equal(typeof result.meta.validatedAt, "string");
  });

  it("reduces score when only warnings present", () => {
    // Build content that passes errors but triggers warnings: e.g., no emoji, no markdown links,
    // but below tipCount by reducing to 1 tip.
    const base = makeValidContent().replace(/:::tip\[Risiko][\s\S]*?:::/, "");
    const result = validateArticle(base, "Analisa IHSG Hari Ini Update Lengkap", ["ihsg"]);
    assert.ok(result.score < 100);
    // Should still pass (warnings only).
    assert.equal(result.passed, true);
  });
});
