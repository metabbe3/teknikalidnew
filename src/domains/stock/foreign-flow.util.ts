/**
 * foreign-flow.util \u2014 SATU PINTU derivasi nilai aliran dana asing.
 * code-audit-tk-2: menggantikan N+1 stockPrice.findUnique per baris ForeignFlow
 * (\u22645 query sekuensial per request SSR) dengan lookup map dari batch findMany.
 *
 * PARITY CONTRACT (lihat scripts/selftest/foreign-flow-parity.selftest.ts):
 * - netValue = (foreignBuy - foreignSell) * close; close null/0 -> netValue null
 * - urutan baris = urutan input ffRows (query sudah orderBy date desc)
 * - konsumen lama: foreignLatest = baris pertama netValue !== null
 */
export interface ForeignFlowRow {
  stockId: number;
  date: Date;
  foreignBuy: unknown;
  foreignSell: unknown;
}

export interface PriceRow {
  stockId: number;
  date: Date;
  close: unknown;
}

export interface ForeignValueRow {
  date: Date;
  netValue: number | null;
}

export function buildForeignRows(ffRows: ForeignFlowRow[], priceRows: PriceRow[]): ForeignValueRow[] {
  const pxByKey = new Map<string, unknown>();
  for (const p of priceRows) {
    pxByKey.set(`${p.stockId}|${p.date.getTime()}`, p.close);
  }
  return ffRows.map((f) => {
    const closeRaw = pxByKey.get(`${f.stockId}|${f.date.getTime()}`);
    const close = closeRaw != null ? Number(closeRaw) : null;
    const netShares = Number(f.foreignBuy) - Number(f.foreignSell);
    return {
      date: f.date,
      netValue: close !== null && close !== 0 ? netShares * close : null,
    };
  });
}
