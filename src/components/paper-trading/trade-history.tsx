"use client";

import { useTradeHistory, type TradeHistoryItem } from "@/hooks/use-paper-trading";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function HistoryItem({ item }: { item: TradeHistoryItem }) {
  const pnlPositive = (item.realizedPnl ?? 0) >= 0;

  return (
    <div className={`trade-card ${pnlPositive ? "trade-card-bullish" : "trade-card-bearish"} fade-in`}>
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-gray-900">{item.stockTicker.replace(".JK", "")}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              pnlPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {pnlPositive ? "PROFIT" : "LOSS"}
            </span>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-sm font-bold font-mono tabular-nums ${pnlPositive ? "text-emerald-600" : "text-red-500"}`}>
              {pnlPositive ? "+" : ""}{formatRupiah(item.realizedPnl ?? 0)}
            </div>
            <div className={`text-[11px] font-semibold font-mono tabular-nums ${pnlPositive ? "text-emerald-500" : "text-red-400"}`}>
              {pnlPositive ? "+" : ""}{(item.realizedPnlPct ?? 0).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px]">
          <div>
            <span className="text-gray-400">Masuk</span>
            <div className="font-semibold text-gray-700 font-mono tabular-nums">{formatRupiah(item.entryPrice)}</div>
          </div>
          <div>
            <span className="text-gray-400">Keluar</span>
            <div className="font-semibold text-gray-700 font-mono tabular-nums">{formatRupiah(item.closePrice ?? 0)}</div>
          </div>
          <div>
            <span className="text-gray-400">Lot</span>
            <div className="font-semibold text-gray-700">{item.lots}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          {item.strategyTags && item.strategyTags.length > 0 && (
            <div className="flex gap-1">
              {item.strategyTags.map((tag) => (
                <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>
              ))}
            </div>
          )}
          <div className="text-[10px] text-gray-300 ml-auto">
            {item.closedAt ? new Date(item.closedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
          </div>
        </div>

        {item.reason && (
          <div className="text-[11px] text-gray-400 mt-1.5 truncate">{item.reason}</div>
        )}
      </div>
    </div>
  );
}

export function TradeHistory() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTradeHistory();

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-gray-400">Belum ada riwayat trade</div>
        <div className="text-xs text-gray-300 mt-1">Tutup posisi untuk melihat riwayat</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 stagger-grid">
      {items.map((item, i) => (
        <div key={item.id} style={{ "--stagger-i": i } as React.CSSProperties}>
          <HistoryItem item={item} />
        </div>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full text-sm font-semibold text-teal-600 py-3 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
        </button>
      )}
    </div>
  );
}
