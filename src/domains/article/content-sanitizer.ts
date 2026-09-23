/**
 * Post-generation sanitizer for LLM-generated article content.
 *
 * Recurring typo/unit patterns this fixes:
 * 1. "saam" — frequent model typo for "saham".
 * 2. "juta lot" / "ribu lot" / "miliar lot" — StockPrice.volume is in SHARES
 *    (saham), so "lot" is a 100x magnitude error. Site convention is
 *    "juta saham" / "ribu saham". Only the number+unit pattern is rewritten;
 *    legitimate educational prose about "lot" (e.g. "1 lot = 100 saham")
 *    is left untouched.
 */
export function sanitizeGeneratedContent(content: string): string {
  return content
    .replace(/\bsaam\b/g, "saham")
    .replace(/\b(\d[\d.,]*)\s*(juta|ribu|miliar)\s+lot\b/g, "$1 $2 saham");
}
