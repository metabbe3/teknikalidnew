/**
 * Title guard — single source of truth for AI prompt-leakage detection in article titles.
 *
 * Why this exists: AI models sometimes leak conversational meta-text into the title field
 * (e.g., "Berikut adalah beberapa variasi judul alternatif..."). This module provides the
 * canonical patterns and helpers that the parser, validator, service layer, and fact-checker
 * all reuse to reject such titles.
 *
 * Rules:
 * - All functions are pure (no I/O, no AI calls).
 * - Patterns are case-insensitive.
 * - Exported `TITLE_GUARD_PATTERNS` is the authoritative list — extend here, not elsewhere.
 */

export interface TitleGuardPattern {
  rule: string;
  pattern: RegExp;
  message: string;
  /**
   * If true, this pattern only makes sense when checking a title (single line, short string).
   * It will be skipped when scanning article content (which is multi-line and may legitimately
   * contain markdown bold, code fences, or phrases like "Artikel ini disusun..." in a disclaimer).
   */
  titleOnly?: boolean;
}

/**
 * Patterns that signal AI prompt leakage or conversational meta-text in a title.
 * If any pattern matches, the title is rejected.
 *
 * Each pattern is anchored or specific enough to avoid false positives on real headlines.
 */
export const TITLE_GUARD_PATTERNS: TitleGuardPattern[] = [
  // ── Indonesian conversational openers (anchor at start of title) ──
  {
    rule: "ai_conversational_opener",
    pattern: /^berikut (adalah|ini)\b/iu,
    message: "Judul diawali pembuka percakapan AI ('Berikut adalah/ini...').",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^(ini adalah|berikut ini)\b/iu,
    message: "Judul diawali pembuka percakapan AI ('Ini adalah...').",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^teks anda\b/iu,
    message: "Judul merujuk 'Teks Anda' — bocoran prompt AI.",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^kalimat (terakhir|berikut|ini)\b/iu,
    message: "Judul merujuk 'Kalimat terakhir/berikut' — bocoran prompt AI.",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^lanjutan (artikel|teks|dari|naskah)\b/iu,
    message: "Judul diawali 'Lanjutan artikel/teks' — AI completion leak.",
  },
  {
    rule: "ai_meta_language",
    pattern: /^(judul|title)\s+(alternatif|pilihan)\b/iu,
    message: "Judul berisi meta 'judul alternatif' — variasi judul AI.",
  },
  {
    rule: "ai_meta_language",
    pattern: /variasi (judul|title)\b/iu,
    message: "Judul berisi 'variasi judul' — bocoran prompt AI.",
  },
  {
    rule: "ai_self_reference",
    pattern: /^sebagai (seorang\s+)?(AI|asisten|model|assistant)\b/iu,
    message: "Judul diawali 'Sebagai AI/asisten' — bocoran prompt AI.",
  },
  {
    rule: "ai_self_reference",
    pattern: /^saya (akan|bisa|tidak|merekomendasikan)\b/iu,
    message: "Judul diawali 'Saya akan/bisa/tidak' — first-person AI leak.",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^(tentu|baik|tentu saja|oke|ok)\b[,.!]/iu,
    message: "Judul diawali sapaan AI ('Tentu/Baik/OK, ...').",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^(maaf|mohon maaf)\b/iu,
    message: "Judul diawali 'Maaf/Mohon maaf' — AI apology leak.",
  },
  {
    rule: "ai_summary_opener",
    pattern: /^secara keseluruhan\b/iu,
    message: "Judul diawali 'Secara keseluruhan' — ringkasan AI.",
  },
  {
    rule: "ai_meta_language",
    pattern: /^inilah (artikel|naskah|lanjutan|kelanjutan)\b/iu,
    message: "Judul diawali 'Inilah artikel/naskah' — AI meta leak.",
  },
  {
    rule: "ai_meta_language",
    pattern: /berikut (kelanjutan|naskah lengkap|artikel lengkap)\b/iu,
    message: "Judul berisi 'berikut kelanjutan/naskah lengkap' — AI meta leak.",
  },

  // ── English AI leakage (anchor at start) ──
  {
    rule: "ai_conversational_opener",
    pattern: /^(here'?s|here is)\b/iu,
    message: "Title opens with 'Here's/Here is' — AI conversational lead.",
  },
  {
    rule: "ai_conversational_opener",
    pattern: /^(sure|certainly|of course)\b[,.!]/iu,
    message: "Title opens with 'Sure/Certainly/Of course' — AI conversational lead.",
  },
  {
    rule: "ai_self_reference",
    pattern: /^i'?d be happy to\b/iu,
    message: "Title opens with 'I'd be happy to' — AI assistant leak.",
  },
  {
    rule: "ai_self_reference",
    pattern: /as an ai\b/iu,
    message: "Title contains 'as an AI' — AI self-reference.",
  },

  // ── Meta-reference to prompt/preview/title (anywhere in title) ──
  {
    rule: "ai_prompt_reference",
    pattern: /prompt leak/iu,
    message: "Judul merujuk 'prompt leak'.",
  },
  {
    rule: "ai_prompt_reference",
    pattern: /respons(e|)\s+ai/iu,
    message: "Judul merujuk 'respons AI'.",
  },
  {
    rule: "ai_prompt_reference",
    pattern: /output (model|ai)\b/iu,
    message: "Judul merujuk 'output model/AI'.",
  },
  {
    rule: "ai_prompt_reference",
    pattern: /berdasarkan \*?preview\*?\b/iu,
    message: "Judul merujuk 'berdasarkan preview' — bocoran prompt.",
  },
  {
    rule: "ai_prompt_reference",
    pattern: /berdasarkan (judul|title|teks|konten)\b/iu,
    message: "Judul merujuk 'berdasarkan judul/teks' — bocoran prompt.",
  },
  {
    rule: "ai_prompt_reference",
    pattern: /based on the (preview|prompt|title|content)\b/iu,
    message: "Title references prompt/preview/title — AI meta leak.",
  },

  // ── Format artifacts (a real headline never has these) ──
  // These patterns are titleOnly because they legitimately appear in article body content
  // (markdown bold, code blocks, JSON-LD blocks, etc.) but never in a real headline.
  {
    rule: "format_artifact_codeblock",
    pattern: /```/,
    message: "Judul mengandung code fence (```)",
    titleOnly: true,
  },
  {
    rule: "format_artifact_json",
    pattern: /^\s*\{[\s\S]*\}\s*$/u,
    message: "Judul adalah JSON object.",
    titleOnly: true,
  },
  {
    rule: "format_artifact_json",
    pattern: /^\s*\[[\s\S]*\]\s*$/u,
    message: "Judul adalah JSON array.",
    titleOnly: true,
  },
  {
    rule: "format_artifact_bold",
    pattern: /\*\*/,
    message: "Judul mengandung markdown bold (**).",
    titleOnly: true,
  },
  {
    rule: "format_artifact_heading",
    pattern: /^#{1,6}\s/u,
    message: "Judul mengandung marker heading markdown (#).",
    titleOnly: true,
  },

  // ── Existing narrow patterns (kept for backwards compatibility) ──
  // titleOnly because "artikel ini disusun" and "gaya bahasa jurnalistik" commonly appear
  // in legitimate disclaimer / about-section text inside article body.
  {
    rule: "ai_meta_language",
    pattern: /artikel ini disusun/iu,
    message: "Judul berisi 'artikel ini disusun' — meta AI.",
    titleOnly: true,
  },
  {
    rule: "ai_meta_language",
    pattern: /gaya bahasa jurnalistik/iu,
    message: "Judul berisi meta deskripsi gaya bahasa.",
    titleOnly: true,
  },
  {
    rule: "format_artifact_placeholder",
    pattern: /\[insert/iu,
    message: "Judul berisi '[insert' — placeholder AI.",
  },
  {
    rule: "format_artifact_placeholder",
    pattern: /\[tbd/iu,
    message: "Judul berisi '[tbd' — placeholder AI.",
  },
  {
    rule: "format_artifact_placeholder",
    pattern: /\bplaceholder\b/iu,
    message: "Judul berisi 'placeholder'.",
  },
  {
    rule: "format_artifact_placeholder",
    pattern: /lorem ipsum/iu,
    message: "Judul berisi 'lorem ipsum'.",
  },
];

/**
 * Check if a title passes all guard checks. Returns the first violation (or null if clean).
 */
export function findTitleViolation(title: string): TitleGuardPattern | null {
  if (!title) return null;
  for (const guard of TITLE_GUARD_PATTERNS) {
    if (guard.pattern.test(title)) {
      return guard;
    }
  }
  return null;
}

/**
 * Returns true if title passes all pattern + structural checks.
 */
export function passesTitleGuard(title: string): boolean {
  if (!title || typeof title !== "string") return false;
  if (findTitleViolation(title) !== null) return false;

  // Structural sanity
  if (title.length < 10 || title.length > 200) return false;
  if (title.includes("\n") || title.includes("\r")) return false;
  if (/\.{3,}$|…$/.test(title)) return false; // trailing ellipsis
  if (!/[A-Za-z\u00C0-\u024F]/.test(title)) return false; // at least one Latin letter

  const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 3 || wordCount > 20) return false;

  return true;
}

/**
 * H2 section names that are structural (not article headlines).
 * Used by extractFirstH2 to skip non-headline H2s.
 */
const STRUCTURAL_H2_NAMES = [
  "kata kunci terkait",
  "kata kunci",
  "disclaimer",
  "disclaimer on",
  "tips",
  "cta",
  "ringkasan",
  "kesimpulan",
  "referensi",
  "sumber",
];

/**
 * Extract the first "real" H2 heading from a markdown article body.
 * Skips structural sections (Kata Kunci Terkait, Disclaimer, Tips, CTA, etc.).
 *
 * @returns the heading text (without `## ` prefix), trimmed and capped at 200 chars — or null.
 */
export function extractFirstH2(content: string): string | null {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const heading = match[1].replace(/#+\s*$/, "").trim();
    if (!heading) continue;

    // Skip structural sections
    const lower = heading.toLowerCase();
    if (STRUCTURAL_H2_NAMES.some((name) => lower === name || lower.startsWith(name))) {
      continue;
    }

    // Skip H2 that looks like AI meta-text (defensive — parser should already avoid these)
    if (findTitleViolation(heading)) continue;

    // Cap at 200 chars (matches validator max)
    return heading.length > 200 ? heading.slice(0, 200) : heading;
  }

  return null;
}

/**
 * Resolve a title with fallback chain:
 *   1. rawTitle (if passes guard)
 *   2. first H2 from content (if passes guard)
 *   3. provided fallback
 *
 * The fallback is expected to be a safe, curated headline (e.g., topic title,
 * default constructed title, RSS headline).
 */
export function resolveTitle(rawTitle: string, content: string, fallback: string): string {
  if (rawTitle && passesTitleGuard(rawTitle)) {
    return rawTitle;
  }

  const h2 = extractFirstH2(content);
  if (h2 && passesTitleGuard(h2)) {
    return h2;
  }

  return fallback || "Untitled Article";
}
