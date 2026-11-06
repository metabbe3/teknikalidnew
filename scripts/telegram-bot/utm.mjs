const BASE_URL = "https://teknikal.id";

/**
 * Standarisasi UTM untuk seluruh link keluar dari bot Telegram ke web teknikal.id.
 * Selalu menyetel utm_source=telegram, utm_medium=bot, dan utm_campaign=<campaign>
 * tanpa merusak query parameter yang sudah ada.
 */
export function tgWebUrl(pathOrUrl, campaign = "bot_link") {
  const url = new URL(pathOrUrl || "/", BASE_URL);
  url.searchParams.set("utm_source", "telegram");
  url.searchParams.set("utm_medium", "bot");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}
