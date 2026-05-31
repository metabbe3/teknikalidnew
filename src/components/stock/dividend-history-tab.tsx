import { formatPrice } from "@/lib/utils";

export interface DividendData {
  year: number;
  type: string;
  amount: number | null;
  currency: string | null;
  exDate: string | null;
  paymentDate: string | null;
}

export function DividendHistoryTab({ dividends }: { dividends: DividendData[] }) {
  if (dividends.length === 0) {
    return (
      <div className="indicator-card depth-shadow p-6 text-center text-text-secondary text-sm">
        Belum ada data dividen
      </div>
    );
  }

  return (
    <div className="indicator-card depth-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Tahun</th>
              <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Jenis</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Per Saham</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Ex Date</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Tanggal Bayar</th>
            </tr>
          </thead>
          <tbody>
            {dividends.map((d, i) => (
              <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-bg-hover/50 transition-colors">
                <td className="py-2.5 px-4 font-mono tabular-nums font-medium">{d.year}</td>
                <td className="py-2.5 px-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    d.type === "cash"
                      ? "bg-bullish/10 text-bullish"
                      : "bg-accent/10 text-accent"
                  }`}>
                    {d.type === "cash" ? "Tunas" : "Saham"}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {d.amount !== null ? `${formatPrice(d.amount)} ${d.currency ?? "IDR"}` : "—"}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-text-secondary">
                  {d.exDate ?? "—"}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-text-secondary">
                  {d.paymentDate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
