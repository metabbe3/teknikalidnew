/**
 * Security-audit 28 Okt (finding: jsonld-script-breakout):
 * JSON.stringify TIDAK meng-escape "/" — string berisi "</script>" bisa menutup
 * blok <script type="application/ld+json"> lebih awal = stored XSS. Escape "<"
 * ke \u003c (valid JSON, aman di dalam script block) di SEMUA situs jsonLd.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
