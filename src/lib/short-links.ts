/**
 * Short links teknikal.id — satu sumber kebenaran.
 * Map: code → { target (path tanpa utm), utm (digabung otomatis) }.
 *
 * Konvensi (owner 27 Okt 2026):
 * - code pendek, huruf kecil, human-typeable: s/hsc, s/qr, s/ig
 * - utm_source wajib; utm_campaign per-post (contoh: hsc-2710)
 * - QR slide memakai s/qr; bio IG/Threads boleh pakai s/ig / s/th
 * - Unknown code → fallback home TANPA utm (jangan 404 — pengunjung tetap mendarat)
 *
 * Menambah link: append ke LINKS di bawah. Tidak perlu migrate/deploy DB.
 */

export type ShortLink = {
  target: string;
  utm: Record<string, string>;
};

const LINKS: Record<string, ShortLink> = {
  // QR footer slide IG/Threads (regenerasi QR → teknikal.id/s/qr)
  qr: {
    target: "/",
    utm: { utm_source: "social", utm_medium: "qr", utm_campaign: "slide-qr" },
  },
  // Bio Instagram
  ig: {
    target: "/",
    utm: { utm_source: "instagram", utm_medium: "bio", utm_campaign: "bio" },
  },
  // Bio Threads
  th: {
    target: "/",
    utm: { utm_source: "threads", utm_medium: "bio", utm_campaign: "bio" },
  },
  // Post berita HSC 26 Okt 2026 (contoh pola per-post: <ticker>-<ddmm>)
  // HSC di-delisting 26 Okt → halaman sahamnya 404; arahkan ke daftar saham.
  hsc: {
    target: "/stocks",
    utm: { utm_source: "social", utm_medium: "post", utm_campaign: "hsc-2610" },
  },
  // CTA umum "cek chart gratis" (caption/komentar IG & Threads)
  chart: {
    target: "/stocks",
    utm: { utm_source: "social", utm_medium: "post", utm_campaign: "cta-chart" },
  },
};

const HOME_FALLBACK = "/?utm_source=social&utm_medium=shortlink&utm_campaign=unknown-code";

export function resolveShortLink(code: string): string {
  const key = code.toLowerCase().trim();
  const link = LINKS[key];
  if (!link) return HOME_FALLBACK;
  const url = new URL(link.target, "https://teknikal.id");
  for (const [k, v] of Object.entries(link.utm)) url.searchParams.set(k, v);
  return url.pathname + url.search;
}
