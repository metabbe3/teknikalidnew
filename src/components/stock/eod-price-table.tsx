import Link from "next/link";
import { formatPrice, formatPercent, formatVolume, stripJk, changeColor } from "@/lib/utils";

/**
 * EodPriceTable — tabel SSR ringkas "harga saham hari ini" untuk landing SEO
 * /harga-saham-hari-ini (PRD idea-2026-10-10-1 AC2/AC6).
 * Server component murni — 0 client-JS; hanya <Link> untuk navigasi ticker.
 * Ranking = nilai transaksi (close × volume, desc) dari query DB asli (rule qa-30-01).
 * Fallback jujur: pool kosong → pesan jujur, bukan error (AC7).
 */
export function EodPriceTable({
  rows,
}: {
  rows: { ticker: string; name: string; close: number; volume: number; prevClose: number | null }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-bg-card p-6 text-sm text-text-secondary">
        Data harga belum tersedia saat ini. Silakan muat ulang beberapa saat lagi atau lihat{" "}
        <Link href="/stocks" className="text-accent hover:underline">
          daftar saham lengkap di screener
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 font-semibold">Ticker</th>
            <th className="px-4 py-2.5 font-semibold">Nama</th>
            <th className="px-4 py-2.5 text-right font-semibold">Harga</th>
            <th className="px-4 py-2.5 text-right font-semibold">Perubahan</th>
            <th className="px-4 py-2.5 text-right font-semibold">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const changePercent =
              r.prevClose !== null && r.prevClose !== 0 ? ((r.close - r.prevClose) / r.prevClose) * 100 : null;
            return (
              <tr key={r.ticker} className="border-b border-border/60 last:border-0 hover:bg-accent/[0.04]">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/stocks/${r.ticker}`}
                    className="inline-block py-1.5 font-bold text-accent hover:underline"
                  >
                    {stripJk(r.ticker)}
                  </Link>
                </td>
                <td className="max-w-[200px] truncate px-4 py-2.5 text-text-secondary">{r.name}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatPrice(r.close)}</td>
                <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${changeColor(changePercent)}`}>
                  {changePercent !== null ? formatPercent(changePercent) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text-secondary">
                  {formatVolume(r.volume)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
