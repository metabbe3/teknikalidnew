/**
 * landing_source — prd-2026-11-21-01 (P1 STICKY, CTO night 21 Nov).
 *
 * WHY: returning-ratio kanonik jatuh 8,8% → 6,7% karena DENOMINATOR FLOOD
 * (149 anonId baru 7d, 98,7% one-visit; threads.net 53 + google 34 + bing 22).
 * Instrumen ini mencatat first-landing source per anonId BARU (EngagementEvent
 * type=landing_source, label=landing:<grup>:<path>) supaya eval D+7 (AC3,
 * pre-registered ≥2,7% day-2 return) bisa dipilah per-source — mana kanal
 * banjir yang benar-benar menghasilkan kunjungan kedua.
 *
 * Kontrak (0 migrasi DB, freeze-safe):
 * - Murni pure function — tanpa import DB/react; testable via tsx --test.
 * - Grup: sosmed | organic | direct | internal | other.
 * - utm_source eksplisit MENANG atas referrer header (kanal paid/bot terdata).
 * - Referrer teknikal.id sendiri = internal — BUKAN first-touch (navigasi
 *   antar-halaman kita, bukan kunjungan baru dari luar).
 * - Label cap-64 (kolom EngagementEvent.label VARCHAR(64)).
 */
export type LandingSourceGroup = "sosmed" | "organic" | "direct" | "internal" | "other";

const SOSMED_HOSTS = new Set([
  "threads.net", "www.threads.net", "l.threads.com",
  "instagram.com", "www.instagram.com", "m.facebook.com", "facebook.com", "www.facebook.com",
  "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
  "x.com", "www.x.com", "twitter.com", "www.twitter.com", "t.co",
  "linkedin.com", "www.linkedin.com", "reddit.com", "www.reddit.com",
  "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
  "whatsapp.com", "www.whatsapp.com",
]);

const ORGANIC_HOSTS = new Set([
  "google.com", "www.google.com", "google.co.id", "www.google.co.id",
  "bing.com", "www.bing.com", "cn.bing.com",
  "duckduckgo.com", "www.duckduckgo.com",
  "search.yahoo.com", "yahoo.com", "www.yahoo.com",
  "search.brave.com", "ecosia.org", "www.ecosia.org",
]);

const UTM_GROUP: Record<string, LandingSourceGroup> = {
  telegram: "sosmed", tg: "sosmed", threads: "sosmed", instagram: "sosmed",
  facebook: "sosmed", fb: "sosmed", tiktok: "sosmed", x: "sosmed",
  twitter: "sosmed", twitter_x: "sosmed", reddit: "sosmed", youtube: "sosmed",
  whatsapp: "sosmed", wa: "sosmed",
  google: "organic", bing: "organic", yahoo: "organic",
  duckduckgo: "organic", brave: "organic",
};

/**
 * Klasifikasi referrer/utm → grup. Pure.
 * utmSource (lowercase-trim) menang; referrer diparse URL-nya (host exact-match
 * ke set, bukan substring — "evil-google.com" tidak boleh lolos jadi organic).
 */
export function classifyReferrerGroup(
  referrer: string | null | undefined,
  utmSource?: string | null,
): LandingSourceGroup {
  const utm = utmSource?.trim().toLowerCase();
  if (utm && UTM_GROUP[utm]) return UTM_GROUP[utm];

  if (!referrer) return "direct";
  try {
    const { hostname } = new URL(referrer);
    const host = hostname.toLowerCase().replace(/^www\./, "");
    if (host === "teknikal.id" || host.endsWith(".teknikal.id")) return "internal";
    if (SOSMED_HOSTS.has(hostname.toLowerCase()) || SOSMED_HOSTS.has(host)) return "sosmed";
    if (ORGANIC_HOSTS.has(hostname.toLowerCase()) || ORGANIC_HOSTS.has(host)) return "organic";
  } catch {
    return "direct";
  }
  return "other";
}

/**
 * Label EngagementEvent utk landing_source — format landing:<grup>:<path>.
 * Path di-cap supaya total ≤64 (VARCHAR(64)); query string sudah di-strip
 * upstream (G6) jadi path pendek oleh kebiasaan.
 */
export function buildLandingSourceLabel(group: LandingSourceGroup, path: string): string {
  const prefix = `landing:${group}:`;
  const p = (path ?? "/").slice(0, 64 - prefix.length);
  return `${prefix}${p}`;
}
