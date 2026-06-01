"use client";

import { useState } from "react";
import { useTopUp } from "@/hooks/use-paper-trading";
import { useToast } from "./toast";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const TOPUP_OPTIONS = [
  { value: 10_000_000, label: "10 Juta" },
  { value: 50_000_000, label: "50 Juta" },
  { value: 100_000_000, label: "100 Juta" },
];

interface TopUpModalProps {
  currentBalance: number;
  onClose: () => void;
}

export function TopUpModal({ currentBalance, onClose }: TopUpModalProps) {
  const topUp = useTopUp();
  const { toast } = useToast();
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const handleTopUp = (amount: number) => {
    setSelectedValue(amount);
    topUp.mutate(amount, {
      onSuccess: () => {
        toast(`Berhasil top up ${formatRupiah(amount)}`);
        setTimeout(onClose, 500);
      },
      onError: (err) => {
        toast((err as Error).message, "error");
        setSelectedValue(null);
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm bottom-sheet-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Dark header */}
        <div className="relative overflow-hidden rounded-t-2xl sm:rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Top Up Saldo</h3>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-slate-400">
              Saldo saat ini: <span className="font-bold text-white font-mono tabular-nums">{formatRupiah(currentBalance)}</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {TOPUP_OPTIONS.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleTopUp(opt.value)}
                disabled={topUp.isPending}
                className={`press-scale w-full rounded-xl p-4 text-left transition-all duration-200 border-2 disabled:opacity-40 ${
                  isSelected
                    ? "border-teal-500 bg-teal-50/50"
                    : "border-gray-100 bg-gray-50/50 hover:border-teal-200 hover:bg-teal-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900 font-mono">{opt.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Saldo baru: <span className="font-semibold text-gray-600 font-mono tabular-nums">{formatRupiah(currentBalance + opt.value)}</span>
                    </div>
                  </div>
                  {isSelected && topUp.isPending ? (
                    <svg className="animate-spin w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
