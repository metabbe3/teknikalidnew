/**
 * Derivation baris StockFundamental (qa-2026-10-20-03).
 *
 * Dua bug yang diperbaiki di sini (lihat fundamental-row.test.ts):
 * 1. DATE STAMP — dulu `new Date()` (wall clock). Run weekend/pagi mencetak
 *    baris Sabtu/Minggu/esok-hari yang membawa nilai sesi sebelumnya
 *    (kontaminasi 2026-10-17/18). Baris HARUS distamp dari market-time quote;
 *    kalau waktu pasar tak diketahui, baris dilewati (tidak bisa distamp jujur).
 * 2. MARKET CAP PROVENANCE — dulu menyalin quote.marketCap mentah. Scanner
 *    TradingView sempat lag 1 sesi pada EOD sync 16:30 (bukti QA 20 Okt:
 *    BBCA 637,9 T dari close 16 Okt, padahal close 19 Okt 4.820 → benar 594 T).
 *    marketCap kini = sharesOutstanding × regularMarketPrice (hari sama),
 *    konsisten dengan P/E & P/B di baris yang sama. quote.marketCap hanya
 *    dipakai sebagai fallback saat share count tak tersedia.
 */

export interface FundamentalQuoteInput {
  ticker: string;
  quote: {
    regularMarketPrice?: number | null;
    regularMarketTime?: number | null;
    trailingPE?: number | null;
    forwardPE?: number | null;
    priceToBook?: number | null;
    trailingEps?: number | null;
    dividendYield?: number | null;
    marketCap?: number | null;
    sharesOutstanding?: number | null;
  } | null;
}

export interface FundamentalRow {
  ticker: string;
  stockId: number;
  date: Date;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  eps: number | null;
  dividendYield: number | null;
  marketCap: bigint;
}

/** Derive satu baris fundamental; null bila tak bisa distamp/dihitung jujur. */
export function deriveFundamentalRow(
  input: FundamentalQuoteInput,
  stockLookup: Map<string, { id: number }>,
): FundamentalRow | null {
  const { ticker, quote } = input;
  if (!quote) return null;
  const stock = stockLookup.get(ticker);
  if (!stock) return null;

  // (1) Date stamp jujur: dari market time, bukan wall clock.
  const marketTime = quote.regularMarketTime ?? null;
  if (!marketTime || marketTime <= 0) return null;
  const date = new Date(marketTime * 1000);

  const price = quote.regularMarketPrice ?? null;
  if (price === null) return null;

  // (2) marketCap = shares × price hari-yang-sama; fallback quote.marketCap.
  let marketCap: bigint | null = null;
  const shares = quote.sharesOutstanding ?? null;
  if (shares != null && shares > 0) {
    marketCap = BigInt(Math.round(shares * price));
  }
  if (marketCap === null) {
    const qcap = quote.marketCap ?? null;
    marketCap = qcap != null && qcap > 0 ? BigInt(Math.round(qcap)) : null;
  }
  if (marketCap === null) return null;

  return {
    ticker,
    stockId: stock.id,
    date,
    pe: quote.trailingPE ?? null,
    forwardPe: quote.forwardPE ?? null,
    pb: quote.priceToBook ?? null,
    eps: quote.trailingEps ?? null,
    dividendYield: quote.dividendYield ?? null,
    marketCap,
  };
}
