import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  TITLE_GUARD_PATTERNS,
  findTitleViolation,
  passesTitleGuard,
  extractFirstH2,
  resolveTitle,
} from "../title-guard";

describe("findTitleViolation", () => {
  it("rejects 'Berikut adalah beberapa variasi judul...'", () => {
    const v = findTitleViolation("Berikut adalah beberapa variasi judul alternatif berdasarkan preview");
    assert.ok(v, "expected a violation");
    assert.equal(v?.rule, "ai_conversational_opener");
  });

  it("rejects 'Berikut ini kelanjutan artikel...'", () => {
    const v = findTitleViolation("Berikut ini kelanjutan artikel yang logis");
    assert.ok(v);
  });

  it("rejects 'Teks Anda terpotong...'", () => {
    const v = findTitleViolation("Teks Anda terpotong di bagian akhir");
    assert.ok(v);
    assert.equal(v?.rule, "ai_conversational_opener");
  });

  it("rejects 'Kalimat terakhir pada preview Anda...'", () => {
    const v = findTitleViolation("Kalimat terakhir pada preview Anda terpotong");
    assert.ok(v);
  });

  it("rejects 'Secara keseluruhan, judul dan preview...'", () => {
    const v = findTitleViolation("Secara keseluruhan, judul dan preview sudah catchy");
    assert.ok(v);
    assert.equal(v?.rule, "ai_summary_opener");
  });

  it("rejects 'Sebagai AI, saya merekomendasikan...'", () => {
    const v = findTitleViolation("Sebagai AI, saya merekomendasikan untuk menambahkan");
    assert.ok(v);
    assert.equal(v?.rule, "ai_self_reference");
  });

  it("rejects 'Inilah artikel lengkap...'", () => {
    const v = findTitleViolation("Inilah artikel lengkap tentang IHSG");
    assert.ok(v);
  });

  it("rejects English 'Here's the article...'", () => {
    const v = findTitleViolation("Here's the article you requested");
    assert.ok(v);
    assert.equal(v?.rule, "ai_conversational_opener");
  });

  it("rejects 'As an AI, ...'", () => {
    const v = findTitleViolation("Analysis: As an AI, I cannot predict");
    assert.ok(v);
    assert.equal(v?.rule, "ai_self_reference");
  });

  it("rejects 'Based on the preview...'", () => {
    const v = findTitleViolation("Based on the preview, here is a refined title");
    assert.ok(v);
    assert.equal(v?.rule, "ai_prompt_reference");
  });

  it("rejects JSON object title", () => {
    const v = findTitleViolation('{"title": "something"}');
    assert.ok(v);
    assert.equal(v?.rule, "format_artifact_json");
  });

  it("rejects markdown bold in title", () => {
    const v = findTitleViolation("**Analisa** IHSG Hari Ini");
    assert.ok(v);
    assert.equal(v?.rule, "format_artifact_bold");
  });

  it("rejects heading marker prefix", () => {
    const v = findTitleViolation("## Analisa IHSG");
    assert.ok(v);
    assert.equal(v?.rule, "format_artifact_heading");
  });

  it("rejects 'berdasarkan preview'", () => {
    const v = findTitleViolation("Judul berdasarkan preview konten");
    assert.ok(v);
  });

  it("accepts valid headline 'BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2'", () => {
    const v = findTitleViolation("BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2");
    assert.equal(v, null);
  });

  it("accepts valid headline 'IHSG Tembus 7.200: 3 Sektor yang Bisa Diserok Pekan Ini'", () => {
    const v = findTitleViolation("IHSG Tembus 7.200: 3 Sektor yang Bisa Diserok Pekan Ini");
    assert.equal(v, null);
  });

  it("returns null on empty input", () => {
    assert.equal(findTitleViolation(""), null);
  });
});

describe("passesTitleGuard", () => {
  it("returns false for leaked titles", () => {
    assert.equal(passesTitleGuard("Berikut adalah variasi judul alternatif"), false);
    assert.equal(passesTitleGuard("Teks Anda terpotong"), false);
    assert.equal(passesTitleGuard("Secara keseluruhan bagus"), false);
  });

  it("returns false for titles shorter than 10 chars", () => {
    assert.equal(passesTitleGuard("IHSG Naik"), false);
  });

  it("returns false for titles longer than 200 chars", () => {
    const long = "A".repeat(210);
    assert.equal(passesTitleGuard(long), false);
  });

  it("returns false for titles with newlines", () => {
    assert.equal(passesTitleGuard("IHSG Hari Ini\nNaik 1%"), false);
  });

  it("returns false for titles ending with ellipsis", () => {
    assert.equal(passesTitleGuard("Analisa IHSG Hari Ini..."), false);
    assert.equal(passesTitleGuard("Analisa IHSG Hari Ini…"), false);
  });

  it("returns false for titles with too few words (<3)", () => {
    // 2 words, too short
    assert.equal(passesTitleGuard("Saham Naik"), false);
  });

  it("returns false for titles with too many words (>20)", () => {
    const many = Array.from({ length: 22 }, (_, i) => `word${i}`).join(" ");
    assert.equal(passesTitleGuard(many), false);
  });

  it("returns false for non-string input", () => {
    assert.equal(passesTitleGuard(null as unknown as string), false);
    assert.equal(passesTitleGuard(undefined as unknown as string), false);
  });

  it("returns true for a valid 6-word headline", () => {
    assert.equal(passesTitleGuard("BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG"), true);
  });

  it("returns true for a valid question headline", () => {
    assert.equal(passesTitleGuard("Apakah IHSG Akan Tembus 7.500 Pekan Ini?"), true);
  });
});

describe("extractFirstH2", () => {
  it("returns the first H2 heading text (without ## prefix)", () => {
    const content = "## BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG\n\nParagraf pertama.";
    assert.equal(extractFirstH2(content), "BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG");
  });

  it("skips structural section H2s (Ringkasan, Kesimpulan, Disclaimer, etc.)", () => {
    const content = "## Ringkasan\n\nbody\n\n## Kesimpulan\n\nbody\n\n## Analisa IHSG Hari Ini";
    assert.equal(extractFirstH2(content), "Analisa IHSG Hari Ini");
  });

  it("skips H2 that itself is AI meta-text", () => {
    const content = "## Berikut adalah beberapa variasi judul\n\nbody\n\n## BBCA Naik 1,2% Hari Ini";
    assert.equal(extractFirstH2(content), "BBCA Naik 1,2% Hari Ini");
  });

  it("returns null when content has no H2", () => {
    assert.equal(extractFirstH2("Just paragraphs.\n\nNo heading here."), null);
  });

  it("returns null on empty content", () => {
    assert.equal(extractFirstH2(""), null);
  });

  it("trims trailing # characters", () => {
    const content = "## BBCA Analisa Hari Ini ##";
    assert.equal(extractFirstH2(content), "BBCA Analisa Hari Ini");
  });

  it("caps very long H2 at 200 chars", () => {
    const longHeading = "X".repeat(300);
    const content = `## ${longHeading}`;
    const result = extractFirstH2(content);
    assert.ok(result);
    assert.ok(result!.length <= 200, `expected <=200, got ${result!.length}`);
  });

  it("handles ## Kata Kunci Terkait by skipping it", () => {
    const content = "## Kata Kunci Terkait\n\n- ihsg\n- bbca\n\n## IHSG Sentuh Rekor Baru Hari Ini";
    assert.equal(extractFirstH2(content), "IHSG Sentuh Rekor Baru Hari Ini");
  });
});

describe("resolveTitle", () => {
  it("returns rawTitle when it passes the guard", () => {
    const result = resolveTitle("BBCA Lengkapi 1,2% Hari Ini", "## Something", "fallback");
    assert.equal(result, "BBCA Lengkapi 1,2% Hari Ini");
  });

  it("falls back to first H2 when rawTitle is leaked AI text", () => {
    const result = resolveTitle(
      "Berikut adalah beberapa variasi judul alternatif",
      "## BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG\n\nbody",
      "fallback",
    );
    assert.equal(result, "BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG");
  });

  it("falls back to first H2 when rawTitle is empty", () => {
    const result = resolveTitle("", "## Good Headline About IHSG", "fallback");
    assert.equal(result, "Good Headline About IHSG");
  });

  it("falls back to provided fallback when rawTitle empty and no H2", () => {
    const result = resolveTitle("", "no h2 here", "Safe Fallback Headline");
    assert.equal(result, "Safe Fallback Headline");
  });

  it("falls back to provided fallback when both rawTitle and H2 fail guard", () => {
    const result = resolveTitle(
      "Berikut adalah variasi judul",
      "## Disclaimer\n\nbody\n\nno good h2",
      "Fallback Title",
    );
    assert.equal(result, "Fallback Title");
  });

  it("falls back to provided fallback when H2 is itself leaked AI text", () => {
    const result = resolveTitle(
      "",
      "## Berikut adalah variasi judul\n\nbody",
      "Safe Headline",
    );
    assert.equal(result, "Safe Headline");
  });

  it("uses 'Untitled Article' when fallback is empty", () => {
    const result = resolveTitle("", "no h2", "");
    assert.equal(result, "Untitled Article");
  });
});

describe("TITLE_GUARD_PATTERNS (sanity)", () => {
  it("is non-empty", () => {
    assert.ok(TITLE_GUARD_PATTERNS.length > 10);
  });

  it("every entry has rule, pattern (RegExp), message", () => {
    for (const p of TITLE_GUARD_PATTERNS) {
      assert.equal(typeof p.rule, "string");
      assert.ok(p.pattern instanceof RegExp);
      assert.equal(typeof p.message, "string");
      assert.ok(p.message.length > 0);
    }
  });
});
