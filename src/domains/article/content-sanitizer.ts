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
  // Trust: LLM kadang mengirim body yang sudah JSON-escape dua kali — literal "\n",
  // "\u2014" dsb. tampil mentah di artikel (kejadian brief 16 Okt / rekap 17 Okt).
  // Un-escape SEKALI hanya jika pola literal terdeteksi, lalu sanitizer konten biasa.
  if (/\\n|\\u[0-9a-fA-F]{4}/.test(content)) {
    try {
      const unescaped = JSON.parse(`"${content.replace(/"/g, '\\"')}"`) as string;
      if (unescaped && unescaped.length >= content.length * 0.5) content = unescaped;
    } catch {
      // fallback: ganti pola paling umum secara literal
      content = content
        .replace(/\\n/g, "\n")
        .replace(/\\u2014/g, "—")
        .replace(/\\u2013/g, "–")
        .replace(/\\u00e9/g, "é")
        .replace(/\\"/g, '"');
    }
  }
  return content
    .replace(/\bsaam\b/g, "saham")
    .replace(/\b(\d[\d.,]*)\s*(juta|ribu|miliar)\s+lot\b/g, "$1 $2 saham");
}
