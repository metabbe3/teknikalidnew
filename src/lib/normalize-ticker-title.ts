/**
 * Normalize and sanitize stock name for titles and H1 — strip legal suffixes,
 * cap length at word boundary, avoid cutting in the middle of parentheses.
 * Pure function.
 */

const MAX_LEN = 30;

// Corporate suffixes: (Persero), (Perser..., (Tbk.), Tbk, bare Persero, bare Tb/T, etc.
// Note: we do NOT strip non-corporate parentheses like (BRI).
const CORPORATE_SUFFIX_RE = /\s*(?:\((?:persero|perser|perse|pers|tbk\.?|tb|t)\)?|\b(?:persero|perser|tbk\.?|tb|t))\s*$/i;

export function sanitizeShortName(
  fullName: string,
  fallbackTicker = "",
  maxLen = MAX_LEN,
): string {
  if (!fullName) return fallbackTicker;

  let stripped = fullName.trim();
  let prev: string;
  do {
    prev = stripped;
    stripped = stripped.replace(CORPORATE_SUFFIX_RE, "").trim();
  } while (stripped !== prev);

  // If nothing survived, fallback to ticker
  if (stripped.length === 0) return fallbackTicker;

  // If length fits within budget, check if there is an unclosed parenthesis at the end
  if (stripped.length <= maxLen) {
    const openCount = (stripped.match(/\(/g) || []).length;
    const closeCount = (stripped.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      const lastOpen = stripped.lastIndexOf("(");
      return stripped.slice(0, lastOpen).trim() || fallbackTicker;
    }
    return stripped;
  }

  // Truncate at word boundary within maxLen without cutting words in half
  const window = stripped.slice(0, maxLen);
  const lastSpace = window.lastIndexOf(" ");
  let cut = lastSpace > 0 ? window.slice(0, lastSpace).trim() : window.trim();

  // "jangan truncate di tengah kurung": if cut happens inside open parentheses
  const openCount = (cut.match(/\(/g) || []).length;
  const closeCount = (cut.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    const lastOpen = cut.lastIndexOf("(");
    cut = cut.slice(0, lastOpen).trim();
  }

  return cut || fallbackTicker || stripped.slice(0, maxLen);
}

export function normalizeTickerTitle(
  fullName: string,
  fallbackTicker: string,
  maxLen = MAX_LEN,
): string {
  return sanitizeShortName(fullName, fallbackTicker, maxLen);
}
