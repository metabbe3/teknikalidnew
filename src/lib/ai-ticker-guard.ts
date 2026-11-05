/**
 * AI ticker guard v2 (riset Argon 30 Okt P0-1 — menggantikan blacklist v1).
 * 3-Stage Deterministic Gazetteer + Context Confidence (τ=0.75), <1ms, 0 model tambahan:
 *   1. Kandidat 4-huruf WAJIB ada di VALID_IDX_SET (939 emiten aktif) — "YANG/MACD/VWAP/SKOR" gugur instan.
 *   2. Homonym (107 ticker = kata kamus: DATA/BANK/NAIK/GOOD...) butuh sinyal konteks kuat.
 *   3. Alias populer ("bca" → BBCA) untuk nama pendek.
 * Kenapa bukan blacklist: 107/939 ticker BEI adalah kata kamus — blacklist tak pernah tuntas
 * (ribuan kata ID 4-huruf: buat, cara, awal, saja, tapi...). Whitelist tertutup = satu-satunya presisi.
 */

import { VALID_IDX_SET, HOMONYM_TICKERS, POPULAR_ALIAS } from "./idx-tickers";

/** Kata 4-huruf → layak ticker? (confidence scoring, threshold implisit 0.75) */
export function isPlausibleTicker(
  candidate: string | undefined | null,
  original?: string,
): boolean {
  if (!candidate) return false;
  const t = candidate.toUpperCase().replace(/\.JK$/, "");
  if (!VALID_IDX_SET.has(t)) return false; // bukan emiten aktif → gugur (YANG, MACD, dll)
  if (!HOMONYM_TICKERS.has(t)) return true; // ticker murni (BBCA/TLKM) → lolos apapun case-nya
  // Homonym: butuh sinyal kuat — $TICKER / TICKER.JK eksplisit / "saham TICKER" / all-caps asli user
  if (!original) return false;
  if (new RegExp(`\\$${t}\\b|\\b${t}\\.JK\\b`, "i").test(original)) return true;
  if (new RegExp(`\\b(?:saham|emiten|kode|ticker|nyangkut|avg)\\s+${t}\\b`, "i").test(original)) return true;
  const m = original.match(new RegExp(`\\b(${t}|${t.toLowerCase()}|${t.charAt(0)}${t.slice(1).toLowerCase()})\\b`));
  return !!m && m[1] === t; // hanya bila user menulis bentuk FULL-CAPS asli
}

/** Semua ticker terdeteksi (ranked by confidence) dari teks bebas. */
export function extractTickersRanked(raw: string): string[] {
  const letters = raw.replace(/[^A-Za-z]/g, "");
  const isShouting = letters.length > 6 && letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.7;
  const scores = new Map<string, number>();

  // 1) alias populer
  for (const [alias, tkr] of Object.entries(POPULAR_ALIAS)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(raw) && VALID_IDX_SET.has(tkr)) scores.set(tkr, 0.92);
  }
  // 2) kandidat 4-huruf dalam universe
  for (const m of raw.matchAll(/(\$)?\b([A-Za-z]{4})(\.JK)?\b/g)) {
    const t = m[2].toUpperCase();
    if (!VALID_IDX_SET.has(t)) continue;
    const before = raw.slice(Math.max(0, (m.index ?? 0) - 20), m.index ?? 0);
    const hasTrigger = /\b(?:saham|emiten|kode|ticker|nyangkut|avg)\s+$/i.test(before);
    const isExactCaps = m[2] === t && !isShouting;
    const conf = m[1] || m[3] ? 1.0 : !HOMONYM_TICKERS.has(t) ? 0.9 : hasTrigger ? 0.9 : isExactCaps ? 0.85 : 0.15;
    if (conf >= 0.75) scores.set(t, Math.max(scores.get(t) ?? 0, conf));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/** Ticker pertama (utk routing FAB) — null bila tidak ada. */
export function detectTickerInText(text: string): string | null {
  return extractTickersRanked(text)[0] ?? null;
}

/** Levenshtein distance ≤1 antar token sama-panjang/beda-1 huruf (tanpa dep). */
function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      if (++diff > 1) return false;
      if (la === lb) {
        i++;
        j++;
      } else if (la > lb) {
        i++;
      } else {
        j++;
      }
    }
  }
  return diff + (la - i) + (lb - j) <= 1;
}

/**
 * Rescue typo ticker (loop 5 Nov): token CAPS 4-5 huruf yang BUKAN ticker valid
 * (jadi tak lolos extractTickersRanked) tapi tepat SATU emiten aktif ber-jarak edit ≤1
 * → kandidat koreksi ("BBCAA" → BBCA). Lowercase/gibberish tak pernah jadi kandidat;
 * ambigu (≥2 ticker berjarak 1) → null, jangan nebak.
 */
export function rescueTypoTicker(raw: string): { from: string; to: string } | null {
  const candidates = [...raw.matchAll(/\b([A-Z]{4,5})\b/g)]
    .map((m) => m[1])
    .filter((t) => !VALID_IDX_SET.has(t));
  for (const from of candidates) {
    const matches = [...VALID_IDX_SET].filter((t) => editDistanceAtMost1(from, t));
    if (matches.length === 1) return { from, to: matches[0] };
  }
  return null;
}
