/**
 * Normalize stock long-name for <title> — strip legal suffixes, cap length, never cut mid-word.
 * Pure function; og:title/twitter/description intentionally keep the raw fullName.
 */

const MAX_LEN = 35;
// Suffixes only (anchored $): ' (Persero)', ' Tbk.', ' Tbk' — incl. bare 'Persero' left over
// after a paired strip (e.g. "Persero Tbk"). Loop strips combinations in any order.
const SUFFIX_RE = /\s*(\(persero\)|persero|tbk\.?)$/i;

export function normalizeTickerTitle(fullName: string, fallbackTicker: string): string {
  let stripped = fullName.trim();
  let prev: string;
  do {
    prev = stripped;
    stripped = stripped.replace(SUFFIX_RE, "").trim();
  } while (stripped !== prev);

  // Fallback: nothing survives the strip — return ticker verbatim (no ellipsis, no empty string).
  if (stripped.length === 0) return fallbackTicker;

  if (stripped.length <= MAX_LEN) return stripped;

  // Cut at word boundary within budget (result incl. '…' must stay ≤ MAX_LEN).
  const window = stripped.slice(0, MAX_LEN);
  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace <= 0) {
    // Edge fallback: no boundary in window (single word > MAX_LEN) — hard cut, mid-word unavoidable.
    return window;
  }
  return window.slice(0, lastSpace).trimEnd() + "…";
}
