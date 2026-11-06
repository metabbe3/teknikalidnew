export interface LiveQuoteRow {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  open: number | null;
  prevClose: number | null;
  marketState: string | null;
  note?: string;
}

/**
 * Pre-market & session guard (owner 21 Okt):
 * Pasar reguler BEI beroperasi Senin-Jumat 09:00 - 16:15 WIB (termasuk closing cross).
 * Di luar jendela ini, status pasar dianggap CLOSED_WIB.
 */
export function isLiveMarketOpen(now = new Date()): boolean {
  const nowWib = new Date(now.getTime() + 7 * 3600_000);
  const wibDay = nowWib.getUTCDay(); // 0=Min .. 6=Sab
  const wibMinutes = nowWib.getUTCHours() * 60 + nowWib.getUTCMinutes();
  return wibDay >= 1 && wibDay <= 5 && wibMinutes >= 9 * 60 && wibMinutes <= 16 * 60 + 15;
}

/**
 * Membangun payload LiveQuoteRow saat pasar tutup (CLOSED_WIB).
 * change & changePercent WAJIB null agar tidak menimpa SSR EOD client.
 * Simbol invalid yang tidak memiliki data EOD di DB diberi flag note: "invalid".
 */
export function buildClosedQuoteRow(
  ticker: string,
  eodPrev: Map<string, number>,
  eodLatest: Map<string, number>
): LiveQuoteRow {
  const prev = eodPrev.get(ticker) ?? null;
  const price = (eodLatest.get(ticker) ?? prev) ?? null;
  const isInvalid = price === null && prev === null;
  return {
    ticker,
    price,
    change: null,
    changePercent: null,
    volume: null,
    dayHigh: null,
    dayLow: null,
    open: null,
    prevClose: prev,
    marketState: "CLOSED_WIB",
    ...(isInvalid ? { note: "invalid" } : {}),
  };
}
