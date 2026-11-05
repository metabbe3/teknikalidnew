// tracking-audit G3: SATU PINTU deep-link bot Telegram + jembatan identitas.
// Format: ?start=<TICKER>_JK__a_<12hex anonId> (≤64 char limit Telegram; batch watch_ utk multi).
// poll.mjs memisahkan suffix __a_<hex> → TelegramWatch.anonPrefix → web JOIN bot.
export function tgDeepLink(tickers: string[], watch = false): string {
  const codes = tickers.map((t) => t.replace(/\.JK$/, "").toUpperCase()).filter(Boolean);
  const base = watch || codes.length > 1 ? `watch_${codes.join("_")}` : `${codes[0]}_JK`;
  let anon = "";
  try {
    const a = localStorage.getItem("eng_anon") ?? "";
    const hex = a.replace(/-/g, "").slice(0, 12);
    if (/^[a-f0-9]{12}$/.test(hex)) anon = `__a_${hex}`;
  } catch { /* private mode */ }
  // owner 6 Nov: SEMUA deeplink web → AgentBot (funneling agent). Param lama
  // (TICKER_JK / watch_) tetap dikirim; agentd mem-parse + seed watchlist.
  return `https://t.me/TeknikalidAgentBot?start=${encodeURIComponent(base + anon)}`;
}
