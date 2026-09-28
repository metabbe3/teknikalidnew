/**
 * Deterministic article quality validator.
 * No AI calls — pure regex/string matching. Instant, zero cost.
 *
 * Checks: word count, heading structure, required directives (tip/warning/cta),
 * keyword table, ticker mentions, primary keyword presence, no markdown links.
 */

import { TITLE_GUARD_PATTERNS, findTitleViolation, passesTitleGuard } from "./title-guard";

export interface QualityIssue {
  rule: string;
  severity: "error" | "warning";
  message: string;
}

export interface QualityResult {
  passed: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  meta: {
    wordCount: number;
    h2Count: number;
    tipCount: number;
    tickerCount: number;
    hasKeywordTable: boolean;
    hasCta: boolean;
    hasDisclaimer: boolean;
    validatedAt: string;
  };
}

export function validateArticle(
  content: string,
  title: string,
  keywords: string[],
  opts?: { minWords?: number },
): QualityResult {
  const minWords = opts?.minWords ?? 1200;
  const issues: QualityIssue[] = [];

  // ── AI prompt leakage detection (HARD BLOCK) ──
  // Patterns from title-guard.ts (single source of truth).
  // Title is checked against ALL patterns; content only against patterns that don't
  // have the "title-only" anchoring (most leaked content also fails the validator's
  // other checks, but we add the title-only checks here for defense in depth).
  const titleViolation = findTitleViolation(title);
  if (titleViolation) {
    issues.push({
      rule: "ai_prompt_leak",
      severity: "error",
      message: `Leakage judul: ${titleViolation.message} (rule: ${titleViolation.rule})`,
    });
  }

  // Content-level leakage checks: use a curated subset (patterns without start-anchor
  // are most useful for content too; anchored patterns only make sense for titles).
  const contentLower = content.toLowerCase();
  for (const guard of TITLE_GUARD_PATTERNS) {
    // Skip patterns that only make sense for titles (single-line, short strings).
    // These would produce false positives on long-form content (e.g., markdown bold,
    // code fences, or "Artikel ini disusun..." in a disclaimer section).
    if (guard.titleOnly) continue;
    // Skip anchored patterns for content — they only make sense at title position.
    if (guard.pattern.source.startsWith("^")) continue;
    if (guard.pattern.test(contentLower)) {
      issues.push({
        rule: "ai_prompt_leak",
        severity: "error",
        message: `AI prompt leakage di konten: ${guard.message} (rule: ${guard.rule})`,
      });
    }
  }

  // ── Title sanity check (beyond pattern matching) ──
  if (!passesTitleGuard(title)) {
    // Title failed structural or pattern checks — emit a descriptive issue if not already covered.
    if (!titleViolation) {
      issues.push({
        rule: "title_invalid",
        severity: "error",
        message: `Judul gagal validasi struktural (panjang ${title.length} karakter, ${title.trim().split(/\s+/).filter(Boolean).length} kata). Mungkin terlalu pendek/panjang, mengandung newline, trailing ellipsis, atau di luar rentang 3-20 kata.`,
      });
    }
  }

  // ── Word count ──
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < minWords) {
    issues.push({
      rule: "word_count",
      severity: "error",
      message: `Artikel hanya ${wordCount} kata, minimum ${minWords} kata.`,
    });
  } else if (wordCount < minWords * 1.25) {
    issues.push({
      rule: "word_count",
      severity: "warning",
      message: `Artikel ${wordCount} kata, disarankan minimum 1500 untuk SEO.`,
    });
  }

  // ── Heading structure ──
  const h1Count = (content.match(/^# (?!\d)/gm) || []).length;
  const h2Count = (content.match(/^## /gm) || []).length;

  if (h1Count > 0) {
    issues.push({
      rule: "heading_h1",
      severity: "warning",
      message: `Ditemukan ${h1Count} H1 heading. Gunakan H2 (##) sebagai heading tertinggi.`,
    });
  }

  if (h2Count < 5) {
    issues.push({
      rule: "heading_h2_min",
      severity: "error",
      message: `Hanya ${h2Count} H2 section, minimum 5 dibutuhkan untuk struktur SEO yang baik.`,
    });
  }

  // ── Required directives ──
  const tipCount = (content.match(/:::tip\[/g) || []).length;
  const hasCta = /:::cta\[/.test(content);
  const hasDisclaimer = /:::warning\[Disclaimer/.test(content);

  if (tipCount < 2) {
    issues.push({
      rule: "tip_directive",
      severity: "warning",
      message: `Hanya ${tipCount} :::tip directive, minimum 2 disarankan.`,
    });
  }

  if (!hasCta) {
    issues.push({
      rule: "cta_directive",
      severity: "error",
      message: "Missing :::cta directive di akhir artikel.",
    });
  }

  if (!hasDisclaimer) {
    issues.push({
      rule: "disclaimer_directive",
      severity: "error",
      message: "Missing :::warning[Disclaimer On] directive.",
    });
  }

  // ── Keyword mapping table ──
  const hasKeywordTable = /##\s*Kata Kunci/i.test(content) || /\|\s*Keyword\s*\|/i.test(content);
  if (!hasKeywordTable) {
    issues.push({
      rule: "keyword_table",
      severity: "warning",
      message: "Missing 'Kata Kunci Terkait' table section untuk SEO transparency.",
    });
  }

  // ── Ticker mentions (uppercase 2-5 letter codes) ──
  // Match standalone uppercase words 2-5 chars, not inside markdown directives
  const cleanContent = content.replace(/:::\w+\[.*?\]/g, ""); // strip directive headers
  const tickerMatches = cleanContent.match(/\b([A-Z]{2,5})\b/g) || [];
  // Filter to known-like patterns (exclude common words)
  const excludeWords = new Set([
    "IHSG", "BEI", "OJK", "BI", "JKT", "IDX", "RSS", "API", "URL", "JSON",
    "THE", "AND", "FOR", "NOT", "BUT", "ARE", "WAS", "HAS", "HAD",
    "USD", "IDR", "JPY", "EUR", "GDP", "CPI", "FOMC", "IPO", "ROE",
    "EPS", "PER", "PBV", "DER", "CTA", "SEO", "RSI", "MACD", "ADX",
    "ATR", "OBV", "SMA", "EMA", "ARAH", "ATAU", "DAN", "INI", "ITU",
    "DENGAN", "UNTUK", "PADA", "DARI", "KE", "DI", "YA", "TIDAK",
  ]);
  const tickers = new Set(
    tickerMatches.filter((t) => !excludeWords.has(t)),
  );
  const tickerCount = tickers.size;

  if (tickerCount < 3) {
    issues.push({
      rule: "ticker_mentions",
      severity: "warning",
      message: `Hanya ${tickerCount} ticker disebutkan, minimum 3 untuk internal linking otomatis.`,
    });
  }

  // ── Primary keyword presence ──
  const primaryKeyword = keywords[0]?.toLowerCase();
  if (primaryKeyword) {
    const keywordInContent = content.toLowerCase().includes(primaryKeyword);
    const keywordInTitle = title.toLowerCase().includes(primaryKeyword);
    if (!keywordInContent && !keywordInTitle) {
      issues.push({
        rule: "primary_keyword",
        severity: "error",
        message: `Primary keyword "${keywords[0]}" tidak ditemukan di judul atau konten.`,
      });
    }
  }

  // ── No markdown links (system auto-links tickers) ──
  const markdownLinks = content.match(/\[.+?\]\(https?:\/\/.+?\)/g);
  if (markdownLinks && markdownLinks.length > 0) {
    issues.push({
      rule: "markdown_links",
      severity: "warning",
      message: `Ditemukan ${markdownLinks.length} markdown link. Gunakan teks ticker uppercase saja.`,
    });
  }

  // ── No emoji ──
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(content)) {
    issues.push({
      rule: "no_emoji",
      severity: "warning",
      message: "Artikel mengandung emoji. Hindari penggunaan emoji untuk tone profesional.",
    });
  }

  // ── Score calculation ──
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const score = Math.max(0, 100 - errors.length * 20 - warnings.length * 5);
  const passed = errors.length === 0;

  return {
    passed,
    score,
    issues,
    meta: {
      wordCount,
      h2Count,
      tipCount,
      tickerCount,
      hasKeywordTable,
      hasCta,
      hasDisclaimer,
      validatedAt: new Date().toISOString(),
    },
  };
}
