// tracking-audit G3: SATU PINTU deep-link bot Telegram + jembatan identitas.
// Format: ?start=<TICKER>_JK__a_<12hex anonId> (≤64 char limit Telegram; batch watch_ utk multi).
// poll.mjs memisahkan suffix __a_<hex> → TelegramWatch.anonPrefix → web JOIN bot.
export function tgDeepLink(
  tickers: string[],
  watchOrIntent: boolean | string = false
): string {
  const codes = tickers.map((t) => t.replace(/\.JK$/, "").toUpperCase()).filter(Boolean);
  let base: string;
  if (typeof watchOrIntent === "string") {
    base = `${codes[0]}_JK_${watchOrIntent}`;
  } else if (watchOrIntent || codes.length > 1) {
    base = `watch_${codes.join("_")}`;
  } else {
    base = `${codes[0]}_JK`;
  }
  const anon = tgAnonSuffix();
  // owner 6 Nov: SEMUA deeplink web → AgentBot (funneling agent). Param lama
  // (TICKER_JK / watch_) tetap dikirim; agentd mem-parse + seed watchlist.
  return `https://t.me/TeknikalidAgentBot?start=${encodeURIComponent(base + anon)}`;
}

/**
 * tgAnonSuffix (PRD prd-2026-11-18-01 AC1): suffix identitas web->__a_<12hex>
 * dari localStorage eng_anon (UUID strip dash) — SATU helper dipakai semua CTA.
 * Menerima argumen anon eksplisit (test / server) — tanpa argumen baca localStorage.
 */
export function tgAnonSuffix(explicitAnon?: string): string {
  try {
    const a =
      explicitAnon ??
      (typeof window !== "undefined" ? localStorage.getItem("eng_anon") ?? "" : "");
    const hex = a.replace(/-/g, "").slice(0, 12).toLowerCase();
    if (/^[a-f0-9]{12}$/.test(hex)) return `__a_${hex}`;
  } catch { /* private mode */ }
  return "";
}

