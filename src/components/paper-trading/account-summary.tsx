"use client";

import { useState } from "react";
import type { PaperAccountSummary } from "@/hooks/use-paper-trading";
import { useTogglePublic } from "@/hooks/use-paper-trading";
import { TopUpModal } from "./topup-modal";
import { useToast } from "./toast";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function AccountSummary({ account }: { account: PaperAccountSummary }) {
  const pnlPositive = account.totalPnl >= 0;
  const [showTopUp, setShowTopUp] = useState(false);
  const togglePublic = useTogglePublic();
  const { toast } = useToast();

  const handleToggle = () => {
    togglePublic.mutate(undefined, {
      onSuccess: () => toast(account.isPublic ? "Akun diubah ke privat" : "Akun diubah ke publik"),
      onError: (err) => toast((err as Error).message, "error"),
    });
  };

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden">
        {/* Dark background with grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saldo Simulasi</span>
              <div className="pulse-dot" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTopUp(true)}
                className="press-scale text-[11px] text-teal-300 bg-white/5 backdrop-blur border border-white/10 px-3 py-1 rounded-full hover:bg-white/10 transition-all"
              >
                + Top Up
              </button>
              <button
                onClick={handleToggle}
                disabled={togglePublic.isPending}
                className={`press-scale text-[11px] px-3 py-1 rounded-full border transition-all ${
                  account.isPublic
                    ? "text-teal-300 bg-teal-500/10 border-teal-500/20"
                    : "text-slate-500 bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                {account.isPublic ? "Publik" : "Privat"}
              </button>
            </div>
          </div>

          <div className="font-mono text-2xl font-bold text-white mb-1 tabular-nums">
            {formatRupiah(account.balance)}
          </div>
          <div className="text-[11px] text-slate-500 mb-4">
            Modal awal: <span className="text-slate-400 font-mono">{formatRupiah(account.initialBalance)}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Nilai Total</div>
              <div className="text-sm font-semibold text-white mt-0.5 font-mono tabular-nums">
                {formatRupiah(account.totalValue)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Profit/Loss</div>
              <div className={`text-sm font-semibold mt-0.5 font-mono tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                {pnlPositive ? "+" : ""}{formatRupiah(account.totalPnl)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Return</div>
              <div className={`text-sm font-semibold mt-0.5 font-mono tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                {pnlPositive ? "+" : ""}{account.totalPnlPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTopUp && (
        <TopUpModal
          currentBalance={account.balance}
          onClose={() => setShowTopUp(false)}
        />
      )}
    </>
  );
}
