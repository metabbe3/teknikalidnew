/**
 * Humanizer Module — teknikal.id
 *
 * Deterministic regex-based pass for 8 mechanical AI writing patterns:
 * 1. Closer satu-baris di akhir paragraf yang muncul >1 kali
 * 2. Normalisasi kutip keriting (“ ” ‘ ’) -> lurus (" ')
 * 3. Hapus emoji roket/panah dekoratif di heading (🚀, ✨, ➡️, ➔, ➜, ➡, →)
 * 4. "Bukan sekadar X, ini Y" -> "Y"
 * 5. "Mari kita (simak|lihat|bahas)" di awal kalimat -> hapus frasa
 * 6. Bold dekoratif pada kata acak (bukan angka/ticker)
 * 7. Residu chatbot (pembuka "Pertanyaan bagus!", penutup "Semoga membantu!")
 * 8. Penggantian frasa kaku aman: "terkait dengan" -> "soal", "dalam rangka" -> "untuk", "merupakan" -> "adalah"
 *
 * Invariants:
 * - Tidak mengubah angka / ticker saham / URL / tanggal.
 * - Tidak menyentuh baris tabel markdown (|...|).
 * - Tidak menyentuh heading (#), kecuali penghapusan emoji dekoratif (Rule 3).
 * - Tidak menyentuh baris berisi link markdown atau URL ([](http... / https://...).
 */

export interface HumanizeResult {
  text: string;
  edits: number;
}

const CLOSER_REGEX = /^(Itulah|Begitulah|Sekian|Menarik sekali|Luar biasa)\b[^.!?]*[.!?]\s*$/i;
const CHATBOT_OPENING_REGEX = /^\s*(?:Pertanyaan bagus|Great question)[!.,]?\s*/i;
const CHATBOT_CLOSING_REGEX = /\s*(?:Semoga membantu|Hope this helps)[!.]?\s*$/i;

/**
 * Checks if a bolded text string is protected (stock ticker, market index, or contains digits/metrics).
 */
export function isProtectedBold(inner: string): boolean {
  const trimmed = inner.trim();
  // Contains any digits (e.g. 12%, Rp 10.000, 7.200, Q3 2026, +2,5%, MA-20)
  if (/\d/.test(trimmed)) {
    return true;
  }
  // 4-letter uppercase IDX stock ticker (e.g. BBCA, BBRI, GOTO, TLKM, ASII) or suffix .JK
  if (/^[A-Z]{4}(\.JK)?$/.test(trimmed)) {
    return true;
  }
  // Major IDX market indices
  if (/^(IHSG|LQ45|IDX\d+|KOMPAS100|JII)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

function isTableLine(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isHeadingLine(line: string): boolean {
  return /^#{1,6}\s/.test(line);
}

function hasLinkOrUrl(line: string): boolean {
  return /\[.*?\]\(https?:\/\/[^\)]+\)/.test(line) || /https?:\/\/\S+/.test(line);
}

/**
 * Rule 3: Remove decorative rocket / sparkle / arrow emojis from headings.
 * Preserves functional emojis (📊, 📈, 📉, ✅, ⚠️, 💡).
 */
function applyHeadingEmoji(headingLine: string): { line: string; edits: number } {
  const match = headingLine.match(/^(#{1,6}\s+)(.*)$/);
  if (!match) return { line: headingLine, edits: 0 };

  const prefix = match[1];
  const title = match[2];

  const emojiRegex = /(?:🚀|✨|➡️|➔|➜|➡|→)/gu;
  if (emojiRegex.test(title)) {
    const cleanedTitle = title
      .replace(/(?:🚀|✨|➡️|➔|➜|➡|→)+/gu, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    return { line: `${prefix}${cleanedTitle}`, edits: 1 };
  }

  return { line: headingLine, edits: 0 };
}

/**
 * Rule 2: Normalizes curly double and single quotes to straight ASCII quotes.
 */
function applyCurlyQuotes(line: string): { line: string; edits: number } {
  let edits = 0;
  const matches = line.match(/[“”‘’]/g);
  if (matches) {
    edits = matches.length;
    const cleaned = line
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    return { line: cleaned, edits };
  }
  return { line, edits: 0 };
}

/**
 * Rule 4: "bukan sekadar X, ini Y" / "ini bukan sekadar X, melainkan Y" -> "Y"
 */
function applyBukanSekadar(line: string): { line: string; edits: number } {
  let edits = 0;

  // Case 1: At beginning of sentence / line -> capitalize the following word
  const startRegex = /(^|[.!?]\s+)(?:[Ii]ni\s+)?[Bb]ukan sekadar [^.!?\n]{3,60},?\s*(?:ini|melainkan)\s+([a-zA-Z0-9])/g;
  let res = line.replace(startRegex, (_match, prefix, firstChar) => {
    edits++;
    return (prefix || '') + firstChar.toUpperCase();
  });

  // Case 2: In the middle of a sentence (without consuming preceding demonstrative pronouns)
  const midRegex = /\bbukan sekadar [^.!?\n]{3,60},?\s*(?:ini|melainkan)\s+/gi;
  res = res.replace(midRegex, () => {
    edits++;
    return '';
  });

  return { line: res, edits };
}

/**
 * Rule 5: "Mari kita (simak|lihat|bahas)" at start of sentence -> remove phrase
 */
function applyMariKita(line: string): { line: string; edits: number } {
  let edits = 0;
  const regex = /(^|[.!?]\s+)[Mm]ari kita (?:simak|lihat|bahas)\s+([a-zA-Z0-9])/g;
  const res = line.replace(regex, (_match, prefix, firstChar) => {
    edits++;
    return (prefix || '') + firstChar.toUpperCase();
  });
  return { line: res, edits };
}

/**
 * Rule 6: Strip decorative bold **...** if the inner phrase is not a ticker/index/number.
 */
function applyDecorativeBold(line: string): { line: string; edits: number } {
  let edits = 0;
  const boldRegex = /\*\*([^*]{1,30})\*\*(?=[:\s]|$)/g;
  const res = line.replace(boldRegex, (match, inner) => {
    if (isProtectedBold(inner)) {
      return match;
    }
    edits++;
    return inner;
  });
  return { line: res, edits };
}

/**
 * Rule 8: Safe phrase replacements with case preservation.
 * - "terkait dengan" -> "soal"
 * - "dalam rangka" -> "untuk"
 * - "merupakan" -> "adalah"
 */
function applyWordReplacements(line: string): { line: string; edits: number } {
  let edits = 0;
  const replacements: [RegExp, string][] = [
    [/\bterkait dengan\b/g, 'soal'],
    [/\bTerkait dengan\b/g, 'Soal'],
    [/\bdalam rangka\b/g, 'untuk'],
    [/\bDalam rangka\b/g, 'Untuk'],
    [/\bmerupakan\b/g, 'adalah'],
    [/\bMerupakan\b/g, 'Adalah'],
  ];

  let res = line;
  for (const [pattern, replacement] of replacements) {
    const matches = res.match(pattern);
    if (matches) {
      edits += matches.length;
      res = res.replace(pattern, replacement);
    }
  }
  return { line: res, edits };
}

/**
 * Pure deterministic humanizer pass.
 */
export function humanizePass(text: string): HumanizeResult {
  if (!text) {
    return { text: '', edits: 0 };
  }

  let totalEdits = 0;
  let normalized = text.replace(/\r\n/g, '\n');

  // Rule 7: Chatbot Residue (Opening)
  if (CHATBOT_OPENING_REGEX.test(normalized)) {
    normalized = normalized.replace(CHATBOT_OPENING_REGEX, '');
    totalEdits++;
  }

  // Rule 7: Chatbot Residue (Closing)
  if (CHATBOT_CLOSING_REGEX.test(normalized)) {
    normalized = normalized.replace(CHATBOT_CLOSING_REGEX, '');
    totalEdits++;
  }

  // Split into lines for line-by-line processing
  let lines = normalized.split('\n');

  // Rule 1: Closer satu-baris di akhir paragraf yang muncul >1 kali
  const closerIndices = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isTableLine(line) && !isHeadingLine(line) && !hasLinkOrUrl(line)) {
      if (CLOSER_REGEX.test(line.trim())) {
        closerIndices.add(i);
      }
    }
  }

  // Only remove if it appears strictly > 1 time
  if (closerIndices.size > 1) {
    totalEdits += closerIndices.size;
    lines = lines.filter((_, idx) => !closerIndices.has(idx));
  }

  // Process remaining lines
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // INVARIANT 1: Jangan sentuh baris tabel markdown (|...|)
    if (isTableLine(line)) {
      processedLines.push(line);
      continue;
    }

    // INVARIANT 2: Heading (#) — hanya jalankan Rule 3 (emoji dekoratif)
    if (isHeadingLine(line)) {
      const headingResult = applyHeadingEmoji(line);
      totalEdits += headingResult.edits;
      processedLines.push(headingResult.line);
      continue;
    }

    // INVARIANT 3: Jangan sentuh baris berisi link markdown atau URL
    if (hasLinkOrUrl(line)) {
      processedLines.push(line);
      continue;
    }

    // Normal prose line transformations:
    // Rule 2: Kutip keriting
    const quotesRes = applyCurlyQuotes(line);
    line = quotesRes.line;
    totalEdits += quotesRes.edits;

    // Rule 4: "Bukan sekadar X, ini Y"
    const bukanSekadarRes = applyBukanSekadar(line);
    line = bukanSekadarRes.line;
    totalEdits += bukanSekadarRes.edits;

    // Rule 5: "Mari kita (simak|lihat|bahas)"
    const mariKitaRes = applyMariKita(line);
    line = mariKitaRes.line;
    totalEdits += mariKitaRes.edits;

    // Rule 6: Bold dekoratif
    const boldRes = applyDecorativeBold(line);
    line = boldRes.line;
    totalEdits += boldRes.edits;

    // Rule 8: Kata pengganti aman
    const wordRes = applyWordReplacements(line);
    line = wordRes.line;
    totalEdits += wordRes.edits;

    processedLines.push(line);
  }

  let resultText = processedLines.join('\n');

  // Collapse 3+ consecutive newlines created by closer removals into standard paragraph breaks
  if (closerIndices.size > 1) {
    resultText = resultText.replace(/\n{3,}/g, '\n\n');
  }

  return {
    text: resultText,
    edits: totalEdits,
  };
}
