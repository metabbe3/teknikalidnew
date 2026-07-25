import { prisma } from "./prisma";

// Indodax public REST (native IDR). Docs: github.com/btcid/indodax-official-api-docs
// WebSocket analyzed (wss://ws3.indodax.com/ws) — no OHLC channel + overkill for EOD/cron; REST only for now.
const BASE = "https://indodax.com";
const SPOT_TTL_MS = 90_000; // 90s spot cache (breach scan + page share it)

// Map our crypto ticker -> Indodax pair/symbol. Derived from ticker for scalability
// (any coin: ticker "XRP" -> pair "xrp_idr", symbol "XRPIDR"). Overrides for exceptions only.
const PAIR_OVERRIDES: Record<string, { pair: string; symbol: string }> = {};

export function cryptoPair(ticker: string): { pair: string; symbol: string } | null {
  const t = ticker.trim().toUpperCase();
  if (PAIR_OVERRIDES[t]) return PAIR_OVERRIDES[t];
  if (!/^[A-Z0-9]{2,10}$/.test(t)) return null; // sane coin symbol
  return { pair: `${t.toLowerCase()}_idr`, symbol: `${t}IDR` };
}

export type CryptoOHLC = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// IDR OHLC for backfill, daily refresh, and intraday chart. `symbol` e.g. "BTCIDR";
// `tf` is an Indodax timeframe ("1D" daily, "15"/"60" intraday minutes, …).
export async function fetchCryptoIdrOHLC(symbol: string, days: number, tf = "1D"): Promise<CryptoOHLC[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const res = await fetch(`${BASE}/tradingview/history_v2?symbol=${symbol}&tf=${tf}&from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`Indodax history ${symbol} ${res.status}`);
  const rows = (await res.json()) as Array<{
    Time: number;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Volume: string;
  }>;
  return rows.map((r) => ({
    date: new Date(r.Time * 1000),
    open: r.Open,
    high: r.High,
    low: r.Low,
    close: r.Close,
    volume: Math.round(r.Close * Number(r.Volume)),
  }));
}

// Live IDR spot. `pair` e.g. "btc_idr". Returns null on failure (never throws).
export async function fetchCryptoIdrSpot(pair: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/api/ticker/${pair}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { ticker: { last: string } };
    const last = Number(j.ticker.last);
    return Number.isFinite(last) ? last : null;
  } catch {
    return null;
  }
}

// Cached IDR spot for the breach scan + price label (dedup across callers within TTL).
export async function fetchCachedCryptoIdrSpot(ticker: string): Promise<number | null> {
  const info = cryptoPair(ticker);
  if (!info) return null;
  const key = `indodax:spot:${info.pair}`;
  try {
    const cached = await prisma.cachedApiCall.findUnique({ where: { cacheKey: key } });
    if (cached && cached.expiresAt > new Date()) {
      const v = cached.data as { last?: number };
      if (typeof v.last === "number") return v.last;
    }
  } catch {
    // fall through to live fetch
  }
  const last = await fetchCryptoIdrSpot(info.pair);
  if (last !== null) {
    try {
      await prisma.cachedApiCall.upsert({
        where: { cacheKey: key },
        update: { data: { last }, fetchedAt: new Date(), expiresAt: new Date(Date.now() + SPOT_TTL_MS) },
        create: { cacheKey: key, data: { last }, fetchedAt: new Date(), expiresAt: new Date(Date.now() + SPOT_TTL_MS) },
      });
    } catch {
      // cache write failure is non-fatal
    }
  }
  return last;
}
