"use client";

import { useState } from "react";
import Link from "next/link";
import type { HoldingItem } from "@/hooks/use-portfolio";

interface HoldingsTableProps {
  holdings: HoldingItem[];
  onEdit: (ticker: string) => void;
  onDelete: (ticker: string) => void;
}

function formatRupiah(n: number | null) {
  if (n === null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatCompact(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return n.toLocaleString("id-ID");
}

function RsiBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300 text-[10px]">-</span>;
  let color = "text-gray-500 bg-gray-50";
  let label = value.toFixed(0);
  if (value > 70) {
    color = "text-red-600 bg-red-50";
    label += " OB";
  } else if (value < 30) {
    color = "text-emerald-600 bg-emerald-50";
    label += " OS";
  }
  return (
    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${color}`}>
      {label}
    </span>
  );
}

function MacdBadge({ signal }: { signal: string | null }) {
  if (!signal) return <span className="text-gray-300 text-[10px]">-</span>;
  const isBull = signal === "Bullish";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
        isBull ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
      }`}
    >
      {isBull ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
      {signal}
    </span>
  );
}

function HoldingCard({ h, onEdit, onDelete }: { h: HoldingItem; onEdit: (t: string) => void; onDelete: (t: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPositive = (h.pnl ?? 0) >= 0;

  return (
    <div className={`holding-card fade-in ${isPositive ? "holding-card-bullish" : "holding-card-bearish"}`}>
      <Link href={`/stocks/${h.ticker}`} className="block px-4 py-3.5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <span className="text-[10px] font-mono font-bold text-teal-600">
                {h.ticker.replace(".JK", "").slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">
                {h.ticker.replace(".JK", "")}
              </p>
              <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{h.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-bold text-sm font-mono tabular-nums ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
              {h.pnl !== null ? `${isPositive ? "+" : ""}${formatCompact(h.pnl)}` : "-"}
            </p>
            <p className={`text-[10px] font-mono font-semibold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
              {h.pnlPercent !== null ? `${isPositive ? "+" : ""}${h.pnlPercent.toFixed(2)}%` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <div>
            <span className="text-gray-300">Masuk</span>{" "}
            <span className="font-semibold text-gray-600 font-mono tabular-nums">{formatRupiah(h.buyPrice)}</span>
          </div>
          <div>
            <span className="text-gray-300">Sekarang</span>{" "}
            <span className="font-semibold text-gray-600 font-mono tabular-nums">{formatRupiah(h.currentPrice)}</span>
          </div>
          <div>
            <span className="text-gray-300">Lot</span>{" "}
            <span className="font-semibold text-gray-600">{Math.floor(h.quantity / 100)}</span>
          </div>
          {h.marketValue !== null && (
            <div className="ml-auto">
              <span className="font-semibold text-gray-500 font-mono tabular-nums">Rp {formatCompact(h.marketValue)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2.5">
          <RsiBadge value={h.rsi14} />
          <MacdBadge signal={h.macdSignal} />
        </div>
      </Link>

      {/* Actions */}
      <div className="flex border-t border-gray-50">
        <button
          onClick={(e) => { e.preventDefault(); onEdit(h.ticker); }}
          className="press-scale flex-1 py-2.5 text-[11px] font-semibold text-gray-400 hover:text-teal-600 hover:bg-teal-50/50 transition-colors"
        >
          Edit
        </button>
        {!confirmDelete ? (
          <button
            onClick={(e) => { e.preventDefault(); setConfirmDelete(true); }}
            className="press-scale flex-1 py-2.5 text-[11px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-colors border-l border-gray-50"
          >
            Hapus
          </button>
        ) : (
          <div className="flex items-center flex-1 border-l border-gray-50">
            <button
              onClick={(e) => { e.preventDefault(); onDelete(h.ticker); setConfirmDelete(false); }}
              className="press-scale flex-1 py-2.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              Konfirmasi
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setConfirmDelete(false); }}
              className="px-3 text-[10px] text-gray-300 hover:text-gray-500"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function HoldingsTable({ holdings, onEdit, onDelete }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="1.5">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold">Belum ada saham</p>
            <p className="text-slate-400 text-sm mt-1">Tambahkan saham pertamamu untuk mulai tracking</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 stagger-grid">
      {holdings.map((h, i) => (
        <div key={h.ticker} style={{ "--stagger-i": i } as React.CSSProperties}>
          <HoldingCard h={h} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}
