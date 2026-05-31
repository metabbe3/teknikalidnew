import { useState } from "react";

export interface ShareholderData {
  name: string;
  type: string | null;
  shares: number | null;
  percent: number | null;
}

const categoryColors: Record<string, string> = {
  "Pemerintah": "bg-teal-50 text-teal-700 border-teal-200",
  "Government": "bg-teal-50 text-teal-700 border-teal-200",
  "Institusi": "bg-blue-50 text-blue-700 border-blue-200",
  "Institutional": "bg-blue-50 text-blue-700 border-blue-200",
  "Publik": "bg-gray-50 text-gray-700 border-gray-200",
  "Public": "bg-gray-50 text-gray-700 border-gray-200",
  "Individual": "bg-amber-50 text-amber-700 border-amber-200",
  "Perorangan": "bg-amber-50 text-amber-700 border-amber-200",
};

function getCategoryStyle(category: string | null): string {
  if (!category) return "bg-gray-50 text-gray-500 border-gray-200";
  for (const [key, style] of Object.entries(categoryColors)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return style;
  }
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function formatShares(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}Jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}Rb`;
  return value.toFixed(0);
}

export function ShareholdersTab({ shareholders }: { shareholders: ShareholderData[] }) {
  const [showAll, setShowAll] = useState(false);

  if (shareholders.length === 0) {
    return (
      <div className="indicator-card depth-shadow p-6 text-center text-text-secondary text-sm">
        Data pemegang saham tidak tersedia
      </div>
    );
  }

  const displayed = showAll ? shareholders : shareholders.slice(0, 10);
  const hasMore = shareholders.length > 10;

  return (
    <div className="indicator-card depth-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Nama</th>
              <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Kategori</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Saham</th>
              <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-3 px-4">Kepemilikan</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((s, i) => (
              <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-bg-hover/50 transition-colors">
                <td className="py-2.5 px-4 font-medium text-text-primary max-w-[200px] truncate">{s.name}</td>
                <td className="py-2.5 px-4">
                  {s.type ? (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryStyle(s.type)}`}>
                      {s.type}
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-text-secondary">
                  {s.shares !== null ? formatShares(s.shares) : "—"}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {s.percent !== null ? (
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/60 rounded-full"
                          style={{ width: `${Math.min(s.percent, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums">{s.percent.toFixed(2)}%</span>
                    </div>
                  ) : "—"}
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
            Tampilkan semua {shareholders.length} pemegang saham
          </button>
        </div>
      )}
    </div>
  );
}
