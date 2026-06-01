"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useStockPosition, useClosePosition } from "@/hooks/use-paper-trading";
import { TradeModal } from "./trade-modal";
import { useToast } from "./toast";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

interface StockPaperPositionProps {
  ticker: string;
}

export function StockPaperPosition({ ticker }: StockPaperPositionProps) {
  const { data: session } = useSession();
  const { data: position, isLoading } = useStockPosition(ticker);
  const closePosition = useClosePosition();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [confirmClose, setConfirmClose] = useState(false);
  const { toast } = useToast();

  if (!session?.user) return null;

  if (isLoading) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden">
        <div className="skeleton-shimmer h-20" />
      </div>
    );
  }

  // No position — show start CTA
  if (!position) {
    return (
      <>
        <div className="mt-3 relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" className="shrink-0">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              <span className="text-sm text-slate-400">Belum ada posisi simulasi</span>
            </div>
            <button
              onClick={() => { setTradeSide("BUY"); setShowTradeModal(true); }}
              className="press-scale text-xs font-bold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
            >
              Mulai Simulasi
            </button>
          </div>
        </div>
        {showTradeModal && (
          <TradeModal
            onClose={() => setShowTradeModal(false)}
            initialTicker={ticker}
            initialSide={tradeSide}
          />
        )}
      </>
    );
  }

  const pnlPositive = position.unrealizedPnl >= 0;

  // Has position — show card
  return (
    <>
      <div className="mt-3 trade-card fade-in">
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Simulasi Anda</span>
              <div className="pulse-dot" />
              <span className="text-[10px] font-mono bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">
                Spread {(position.spreadBps / 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold font-mono tabular-nums ${pnlPositive ? "text-emerald-600" : "text-red-500"}`}>
                {pnlPositive ? "+" : ""}{formatRupiah(position.unrealizedPnl)}
              </div>
              <div className={`text-[11px] font-semibold font-mono tabular-nums ${pnlPositive ? "text-emerald-500" : "text-red-400"}`}>
                {pnlPositive ? "+" : ""}{position.unrealizedPnlPct.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="text-gray-400">Masuk</span>{" "}
              <span className="font-semibold text-gray-700 font-mono tabular-nums">{formatRupiah(position.avgEntryPrice)}</span>
            </div>
            <div>
              <span className="text-gray-400">Sekarang</span>{" "}
              <span className="font-semibold text-gray-700 font-mono tabular-nums">{formatRupiah(position.currentPrice)}</span>
            </div>
            <div>
              <span className="text-gray-400">Lot</span>{" "}
              <span className="font-semibold text-gray-700">{position.lots}</span>
            </div>
          </div>

          {position.positions[0]?.stopLossPrice && (
            <div className="flex gap-4 mt-1.5 text-[11px]">
              <span className="text-gray-400">SL: <span className="text-red-500 font-semibold font-mono tabular-nums">{formatRupiah(position.positions[0].stopLossPrice)}</span></span>
              {position.positions[0].takeProfitPrice && (
                <span className="text-gray-400">TP: <span className="text-emerald-500 font-semibold font-mono tabular-nums">{formatRupiah(position.positions[0].takeProfitPrice)}</span></span>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setTradeSide("BUY"); setShowTradeModal(true); }}
              className="press-scale text-xs font-semibold bg-teal-50 text-teal-700 px-3.5 py-2 rounded-xl hover:bg-teal-100 transition-colors border border-teal-100"
            >
              Tambah
            </button>
            {!confirmClose ? (
              <button
                onClick={() => setConfirmClose(true)}
                className="press-scale text-xs font-semibold bg-red-50 text-red-600 px-3.5 py-2 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
              >
                Jual
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    closePosition.mutate(position.positions[0].id, {
                      onSuccess: () => {
                        setConfirmClose(false);
                        toast(`Posisi ${ticker.replace(".JK", "")} ditutup`);
                      },
                      onError: (err) => toast((err as Error).message, "error"),
                    });
                  }}
                  disabled={closePosition.isPending}
                  className="press-scale text-xs font-bold bg-red-600 text-white px-3.5 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 shadow-sm"
                >
                  {closePosition.isPending ? "Menjual..." : "Konfirmasi"}
                </button>
                <button onClick={() => setConfirmClose(false)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Batal</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTradeModal && (
        <TradeModal
          onClose={() => setShowTradeModal(false)}
          initialTicker={ticker}
          initialSide={tradeSide}
        />
      )}
    </>
  );
}
