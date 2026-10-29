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
    target: "/pasar",
    utm: { utm_source: "social", utm_medium: "qr", utm_campaign: "slide-qr" },
  },
  // Bio Instagram — Growth-audit 29 Okt: bio mendarat ke /pasar (Koran Saham Live,
  // janji bio "pantauan harian") bukan homepage generik
  ig: {
    target: "/pasar",
    utm: { utm_source: "instagram", utm_medium: "bio", utm_campaign: "bio" },
  },
  // Bio Threads
  th: {
    target: "/pasar",
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

// Growth-audit 29 Okt (Argon P0#1): shortlink dinamis per-ticker TANPA entry statis/DB.
// Pola: s/t-bbca → /stocks/BBCA.JK?utm_source=threads&utm_medium=reply&utm_campaign=t-bbca
//       s/ig-bbca → /stocks/BBCA.JK?utm_source=instagram&utm_medium=slide&utm_campaign=ig-bbca
//       s/kn-bbca → /pasar?utm_source=threads&utm_medium=reply&utm_campaign=kn-bbca
// Ticker disimpan lower-case di URL; halaman saham Next.js case-insensitive utk param ticker.
export function resolveDynamicTickerLink(code: string): string | null {
  const m = code.toLowerCase().match(/^([a-z]{1,2})-([a-z]{4})(?:-?([a-z0-9]{2,4}))?$/);
  if (!m) return null;
  const [, prefix, ticker, day] = m;
  const t = ticker.toUpperCase();
  const camp = day ? `${prefix}-${ticker}-${day}` : `${prefix}-${ticker}`;
  if (prefix === "t") {
    const u = new URL(`/stocks/${t}.JK`, "https://teknikal.id");
    u.searchParams.set("utm_source", "threads");
    u.searchParams.set("utm_medium", "reply");
    u.searchParams.set("utm_campaign", camp);
    return u.pathname + u.search;
  }
  if (prefix === "ig") {
    const u = new URL(`/stocks/${t}.JK`, "https://teknikal.id");
    u.searchParams.set("utm_source", "instagram");
    u.searchParams.set("utm_medium", "slide");
    u.searchParams.set("utm_campaign", camp);
    return u.pathname + u.search;
  }
  if (prefix === "kn") {
    // "kenapa naik" → /pasar (movers + konteks hari ini; halaman kenapa-naik belum ada)
    const u = new URL("/pasar", "https://teknikal.id");
    u.searchParams.set("utm_source", "threads");
    u.searchParams.set("utm_medium", "reply");
    u.searchParams.set("utm_campaign", camp);
    return u.pathname + u.search;
  }
  return null;
}

export function resolveShortLink(code: string): string {
  const key = code.toLowerCase().trim();
  // coba pola dinamis dulu (growth-audit 29 Okt) sebelum map statis
  const dyn = resolveDynamicTickerLink(key);
  if (dyn) return dyn;
  const link = LINKS[key];
  if (!link) return HOME_FALLBACK;
  const url = new URL(link.target, "https://teknikal.id");
  for (const [k, v] of Object.entries(link.utm)) url.searchParams.set(k, v);
  return url.pathname + url.search;
}
