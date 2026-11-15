/**
 * Watchlist presets — data kurasi utk empty-state /watchlist guest
 * (prd-2026-11-15-01 AC2). SATU PINTU data server-side, dibaca page.tsx
 * (/watchlist) via getWatchlistPresets(); TtlCache pattern retention.service.
 *
 * - "Bank Bluechip" & "Dividen" = kurasi statis (tiket biru likuid / kandidat
 *   ex-date terdekat dari StockDividend).
 * - "Populer Minggu Ini" = snapshot SQL ranking views /stocks/<ticker>.JK 21d
 *   (breadth-rule qa-30-01 — groupBy path, bukan LIKE string concat).
 *   Di-rebuild saat revalidate 60s page — BUKAN runtime query per-request
 *   baru (cache 5 mnt, zero endpoint baru — PRD scope).
 */
import { prisma } from "@/lib/prisma";
import { TtlCache } from "@/lib/cache";

export interface WatchlistPreset {
  key: string;
  label: string;
  description: string;
  tickers: string[];
}

const PRESET_CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new TtlCache<WatchlistPreset[]>();

const BANK_BLUECHIP = ["BBCA.JK", "BMRI.JK", "BBRI.JK"];
const DIVIDEND_CANDIDATES = ["BBRI.JK", "BMRI.JK", "BBCA.JK"];
const POPULAR_FALLBACK = ["BBCA.JK", "TPIA.JK", "AADI.JK"];

async function popularTickers(): Promise<string[]> {
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  // groupBy path (satu pintu breadth-rule) — ranking ticker page views 21d.
  const rows = await prisma.pageView.groupBy({
    by: ["path"],
    _count: { _all: true },
    where: {
      isBot: false,
      createdAt: { gte: since },
      path: { startsWith: "/stocks/" },
    },
    orderBy: { _count: { path: "desc" } },
    take: 40,
  });
  const tickers = rows
    .map((r) => {
      const m = /^\/stocks\/([A-Z0-9]{2,10}\.JK)$/.exec(r.path);
      return m ? m[1] : null;
    })
    .filter((t): t is string => t !== null);
  // dedupe (path unik by groupBy, tapi .JK case-variant tak mungkin — defensive)
  return [...new Set(tickers)].slice(0, 3);
}

async function dividendTickers(): Promise<string[]> {
  // Kandidat ex-date terdekat (cumDate maju terdekat) — top-3 unik ticker.
  const today = new Date();
  const rows = await prisma.stockDividend.findMany({
    where: { cumDate: { gte: today } },
    orderBy: { cumDate: "asc" },
    take: 30,
    select: { stock: { select: { ticker: true } } },
  });
  const tickers = [...new Set(rows.map((r) => r.stock.ticker))];
  return tickers.slice(0, 3);
}

export async function getWatchlistPresets(): Promise<WatchlistPreset[]> {
  const cached = cache.get("presets");
  if (cached) return cached;

  const [popular, dividend] = await Promise.all([
    popularTickers().catch(() => POPULAR_FALLBACK),
    dividendTickers().catch(() => DIVIDEND_CANDIDATES),
  ]);

  const presets: WatchlistPreset[] = [
    {
      key: "bank-bluechip",
      label: "Bank Bluechip",
      description: "3 bank terbesar BEI — likuid, blue-chip",
      tickers: BANK_BLUECHIP,
    },
    {
      key: "dividen",
      label: "Pembagi Dividen Terdekat",
      description: "Ex-date terdekat dari kalender dividen",
      tickers: dividend.length > 0 ? dividend : DIVIDEND_CANDIDATES,
    },
    {
      key: "populer",
      label: "Populer Minggu Ini",
      description: "Paling banyak dilihat 21 hari terakhir",
      tickers: popular.length > 0 ? popular : POPULAR_FALLBACK,
    },
  ];
  cache.set("presets", presets, PRESET_CACHE_TTL_MS);
  return presets;
}
