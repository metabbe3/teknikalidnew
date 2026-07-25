import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseAIResponse } from "../ai-provider";

describe("parseAIResponse — title extraction order", () => {
  it("prefers first H2 of markdown body over JSON title when AI returns JSON with leaked title", () => {
    // This is the actual production bug: AI returned JSON with conversational title
    // but the markdown content inside had the real H2 headline.
    const aiResponse = JSON.stringify({
      title: "Berikut adalah beberapa variasi judul alternatif berdasarkan preview konten Anda",
      excerpt: "IHSG menguat signifikan",
      content:
        "## BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2\n\nIHSG menguat signifikan hari ini.",
      tags: ["ihsg", "bbca"],
    });

    const result = parseAIResponse(aiResponse);
    assert.equal(result.title, "BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2");
    assert.ok(result.content.includes("## BBCA"));
  });

  it("extracts title from pure markdown response starting with ## ", () => {
    const md =
      "## BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2\n\n" +
      "Paragraf pembuka tentang saham ini.\n\n" +
      "## Analisa Teknikal\n\nLebih lanjut di sini.";
    const result = parseAIResponse(md);
    assert.equal(result.title, "BBCA Lengkapi 1,2% di Tengah Ekspektasi GCG Bank Q2");
  });

  it("rejects JSON title when it is conversational AI leak and no H2 fallback exists", () => {
    const aiResponse = JSON.stringify({
      title: "Berikut adalah kelanjutan artikel yang logis dan mendalam",
      content: "Tidak ada H2 sama sekali di sini, hanya paragraf biasa.",
    });
    const result = parseAIResponse(aiResponse);
    assert.equal(result.title, "", "conversational JSON title must be rejected");
  });

  it("uses valid JSON title only when there is no H2 in content", () => {
    const aiResponse = JSON.stringify({
      title: "BBCA Analisa Teknikal Hari Ini Update",
      content: "Paragraf pembuka tanpa heading apa pun.",
    });
    const result = parseAIResponse(aiResponse);
    assert.equal(result.title, "BBCA Analisa Teknikal Hari Ini Update");
  });

  it("extracts H1 as last-resort title when no H2 and no valid JSON title", () => {
    const md = "# IHSG Hari Ini Naik Tajam\n\nParagraf pembuka.\n\nParagraf kedua di sini.";
    const result = parseAIResponse(md);
    assert.equal(result.title, "IHSG Hari Ini Naik Tajam");
  });

  it("returns empty title and slug when response is empty", () => {
    const result = parseAIResponse("");
    assert.equal(result.title, "");
    assert.equal(result.content, "");
    assert.equal(result.slug, "");
  });

  it("returns empty title when response is whitespace only", () => {
    const result = parseAIResponse("   \n  \t  \n");
    assert.equal(result.title, "");
  });

  it("rejects JSON title with trailing ellipsis even when no H2 exists", () => {
    const aiResponse = JSON.stringify({
      title: "Berikut adalah beberapa variasi judul...",
      content: "Konten tanpa heading sama sekali.",
    });
    const result = parseAIResponse(aiResponse);
    assert.equal(result.title, "");
  });

  it("preserves markdown content when AI wraps in ```json fence", () => {
    const aiResponse =
      "```json\n" +
      JSON.stringify({
        title: "Sebagai AI saya merekomendasikan variasi judul",
        content: "## IHSG Sentuh Rekor Baru Hari Ini\n\nParagraf pembuka tentang IHSG.",
      }) +
      "\n```";
    const result = parseAIResponse(aiResponse);
    assert.equal(result.title, "IHSG Sentuh Rekor Baru Hari Ini");
    assert.ok(result.content.includes("## IHSG Sentuh Rekor Baru"));
  });

  it("falls back to slug 'untitled' when response is non-empty but no title recoverable", () => {
    // Non-empty content with no extractable title should still get the "untitled" slug
    // from buildSlug(title || "untitled").
    const result = parseAIResponse("paragraf tanpa heading sama sekali di sini.");
    assert.equal(result.title, "");
    assert.equal(result.slug, "untitled");
  });

  it("builds a slug from a clean title (special chars stripped)", () => {
    // buildSlug strips non-word chars (comma, percent) so "1,2%" becomes "12".
    const md = "## BBCA Lengkapi 1,2% Hari Ini\n\nbody";
    const result = parseAIResponse(md);
    assert.equal(result.slug, "bbca-lengkapi-12-hari-ini");
  });

  it("skips structural H2 (e.g., ## Ringkasan) and uses next real H2 as title", () => {
    const md =
      "## Ringkasan\n\nIsi ringkasan.\n\n" +
      "## Kesimpulan\n\nIsi kesimpulan.\n\n" +
      "## IHKG Melemah Tajam Hari Ini Karena Faktor Eksternal\n\nBody.";
    const result = parseAIResponse(md);
    assert.equal(result.title, "IHKG Melemah Tajam Hari Ini Karena Faktor Eksternal");
  });

  it("extracts excerpt from first non-heading paragraph when no JSON excerpt", () => {
    const md =
      "## BBCA Naik 1,2% Hari Ini\n\n" +
      "Ini adalah paragraf pembuka yang cukup panjang untuk dijadikan excerpt oleh sistem parser.\n\n" +
      "Paragraf kedua di sini.";
    const result = parseAIResponse(md);
    assert.ok(result.excerpt.length > 0);
    assert.ok(result.excerpt.includes("paragraf pembuka"));
  });
});
