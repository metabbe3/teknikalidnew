"use client";

import { useState } from "react";
import { useClosePosition, useUpdatePosition, type OpenPosition } from "@/hooks/use-paper-trading";
import { useToast } from "./toast";
import { TradeModal } from "./trade-modal";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const MOOD_LABELS: Record<string, string> = {
  CONFIDENT: "Yakin",
  UNCERTAIN: "Ragu",
  GREEDY: "Serakah",
  FEARFUL: "Takut",
  NEUTRAL: "Netral",
};

function PositionCard({ position }: { position: OpenPosition }) {
  const [expanded, setExpanded] = useState(false);
  const [showSLTP, setShowSLTP] = useState(false);
  const [slInput, setSlInput] = useState(position.stopLossPrice?.toString() ?? "");
  const [tpInput, setTpInput] = useState(position.takeProfitPrice?.toString() ?? "");
  const closePosition = useClosePosition();
  const updatePosition = useUpdatePosition();
  const [confirmClose, setConfirmClose] = useState(false);
  const { toast } = useToast();

  const pnlPositive = position.unrealizedPnl >= 0;
  const isBuy = position.side === "BUY";

  const handleSaveSLTP = () => {
    updatePosition.mutate({
      positionId: position.id,
      data: {
        stopLossPrice: slInput ? Number(slInput) : null,
        takeProfitPrice: tpInput ? Number(tpInput) : null,
      },
    }, {
      onSuccess: () => {
        setShowSLTP(false);
        toast("SL/TP berhasil diupdate");
      },
      onError: (err) => toast((err as Error).message, "error"),
    });
  };

  const handleClose = () => {
    closePosition.mutate(position.id, {
      onSuccess: () => {
        setConfirmClose(false);
        toast(`Posisi ${position.stockTicker.replace(".JK", "")} ditutup`);
      },
      onError: (err) => toast((err as Error).message, "error"),
    });
  };

  return (
    <div className={`trade-card ${isBuy ? "trade-card-bullish" : "trade-card-bearish"} fade-in`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{position.stockTicker.replace(".JK", "")}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              isBuy ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"
            }`}>
              {isBuy ? "BELI" : "JUAL"}
            </span>
            {position.strategyTags?.map((tag) => (
              <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{position.stockName}</div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900 font-mono tabular-nums">{position.lots} lot</div>
          <div className="text-[11px] text-gray-400 font-mono tabular-nums">{formatRupiah(position.entryPrice)}</div>
        </div>

        <div className="text-right min-w-[90px]">
          <div className={`text-sm font-bold font-mono tabular-nums ${pnlPositive ? "text-emerald-600" : "text-red-500"}`}>
            {pnlPositive ? "+" : ""}{formatRupiah(position.unrealizedPnl)}
          </div>
          <div className={`text-[11px] font-semibold font-mono tabular-nums ${pnlPositive ? "text-emerald-500" : "text-red-400"}`}>
            {pnlPositive ? "+" : ""}{position.unrealizedPnlPct.toFixed(2)}%
          </div>
        </div>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" className={`text-gray-300 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 slide-down-enter">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Harga Masuk</div>
              <div className="font-semibold text-gray-900 mt-0.5 font-mono tabular-nums">{formatRupiah(position.entryPrice)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Harga Sekarang</div>
              <div className="font-semibold text-gray-900 mt-0.5 font-mono tabular-nums">{formatRupiah(position.currentPrice)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Nilai Pasar</div>
              <div className="font-semibold text-gray-900 mt-0.5 font-mono tabular-nums">{formatRupiah(position.marketValue)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Status</div>
              <div className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                <div className="pulse-dot" />
                <span>Terbuka</span>
              </div>
            </div>
          </div>

          {/* SL/TP display */}
          {(position.stopLossPrice || position.takeProfitPrice) && !showSLTP && (
            <div className="flex gap-3 text-xs">
              {position.stopLossPrice && (
                <div className="flex-1 bg-red-50 rounded-lg p-2.5 border border-red-100">
                  <div className="text-[10px] text-red-400 uppercase tracking-wider font-medium">Stop Loss</div>
                  <div className="font-semibold text-red-600 mt-0.5 font-mono tabular-nums">{formatRupiah(position.stopLossPrice)}</div>
                </div>
              )}
              {position.takeProfitPrice && (
                <div className="flex-1 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">Take Profit</div>
                  <div className="font-semibold text-emerald-600 mt-0.5 font-mono tabular-nums">{formatRupiah(position.takeProfitPrice)}</div>
                </div>
              )}
            </div>
          )}

          {/* Journal info */}
          {position.reason && (
            <div className="text-xs bg-gray-50 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Alasan</div>
              <span className="text-gray-600 leading-relaxed">{position.reason}</span>
            </div>
          )}
          {position.mood && (
            <div className="text-xs text-gray-400">
              Mood: <span className="text-gray-600 font-medium">{MOOD_LABELS[position.mood] ?? position.mood}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {!showSLTP && !confirmClose && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSLTP(true); }}
                  className="press-scale text-xs font-semibold bg-gray-100 text-gray-600 px-3.5 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Atur SL/TP
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmClose(true); }}
                  className="press-scale text-xs font-semibold bg-red-50 text-red-600 px-3.5 py-2 rounded-xl hover:bg-red-100 transition-colors"
                >
                  Tutup Posisi
                </button>
              </>
            )}
          </div>

          {/* SL/TP editor */}
          {showSLTP && (
            <div className="bg-gray-50 rounded-xl p-3.5 space-y-3 slide-down-enter border border-gray-100">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Stop Loss</label>
                <input
                  type="number"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  placeholder="Harga stop loss"
                  className="w-full text-sm font-mono border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/40 tabular-nums"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Take Profit</label>
                <input
                  type="number"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  placeholder="Harga take profit"
                  className="w-full text-sm font-mono border border-gray-200 rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/40 tabular-nums"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleSaveSLTP(); }}
                  disabled={updatePosition.isPending}
                  className="press-scale text-xs font-semibold bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                >
                  {updatePosition.isPending ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSLTP(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Close confirmation */}
          {confirmClose && (
            <div className="bg-red-50 rounded-xl p-3.5 border border-red-100 slide-down-enter">
              <p className="text-xs text-red-600 font-medium mb-3">
                Tutup posisi <span className="font-bold">{position.stockTicker.replace(".JK", "")}</span> ({position.lots} lot)?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleClose(); }}
                  disabled={closePosition.isPending}
                  className="press-scale text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 shadow-sm"
                >
                  {closePosition.isPending ? "Menutup..." : "Ya, Tutup"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmClose(false); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2 font-medium"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PositionsTable({ positions }: { positions: OpenPosition[] }) {
  const [showTrade, setShowTrade] = useState(false);

  if (positions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-gray-400">Belum ada posisi terbuka</div>
        <div className="text-xs text-gray-300 mt-1 mb-4">Mulai trading untuk melihat posisi di sini</div>
        <button
          onClick={() => setShowTrade(true)}
          className="press-scale text-xs font-bold bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 shadow-sm shadow-teal-600/20"
        >
          Mulai Trade
        </button>
        {showTrade && <TradeModal onClose={() => setShowTrade(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-2 stagger-grid">
      {positions.map((pos, i) => (
        <div key={pos.id} style={{ "--stagger-i": i } as React.CSSProperties}>
          <PositionCard position={pos} />
        </div>
      ))}
    </div>
  );
}
