import { useState } from "react";

export interface SubsidiaryData {
  name: string;
  businessType: string | null;
  totalAssets: number | null;
  ownershipPercent: number | null;
}

export function SubsidiariesTab({ subsidiaries }: { subsidiaries: SubsidiaryData[] }) {
  const [showAll, setShowAll] = useState(false);

  if (subsidiaries.length === 0) {
    return (
      <div className="indicator-card depth-shadow p-6 text-center text-text-secondary text-sm">
        Data anak perusahaan tidak tersedia
      </div>
    );
  }

  const displayed = showAll ? subsidiaries : subsidiaries.slice(0, 5);
  const hasMore = subsidiaries.length > 5;

  return (
    <div className="indicator-card depth-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Nama</th>
              <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Bidang Usaha</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Kepemilikan</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Total Aset</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((s, i) => (
              <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-bg-hover/50 transition-colors">
                <td className="py-2.5 px-4 font-medium text-text-primary">{s.name}</td>
                <td className="py-2.5 px-4 text-text-secondary">{s.businessType ?? "—"}</td>
                <td className="py-2.5 px-4 text-right">
                  {s.ownershipPercent !== null ? (
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/60 rounded-full"
                          style={{ width: `${Math.min(s.ownershipPercent, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums">{s.ownershipPercent}%</span>
                    </div>
                  ) : "—"}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {s.totalAssets !== null ? formatAssets(s.totalAssets) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && !showAll && (
        <div className="px-4 py-3 border-t border-border/30 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-accent hover:underline font-medium"
          >
            Tampilkan semua {subsidiaries.length} anak perusahaan
          </button>
        </div>
      )}
    </div>
  );
}

function formatAssets(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}
