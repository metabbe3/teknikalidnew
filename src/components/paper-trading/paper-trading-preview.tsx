"use client";

import { GatedContent } from "@/components/ui/gated-content";

export function PaperTradingPreview() {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      <GatedContent
        message="Daftar untuk mulai simulasi trading gratis dengan saldo virtual hingga Rp 100 juta"
        ctaText="Daftar Gratis"
        blurPx={6}
      >
        {/* Mock account summary card */}
        <div className="mt-4 rounded-xl bg-bg-card depth-shadow p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" />
              </svg>
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Saldo Virtual</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary font-mono tabular-nums">Rp 10.000.000</p>
          <div className="flex items-center gap-6 mt-3">
            <div>
              <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Total Nilai</p>
              <p className="text-sm font-medium text-text-secondary font-mono tabular-nums">Rp 10.000.000</p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">P&L</p>
              <p className="text-sm font-bold text-bullish font-mono tabular-nums">+Rp 0 (0.00%)</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-[10px] text-text-tertiary font-mono">0 posisi terbuka</span>
          </div>
        </div>

        {/* Mock tab bar */}
        <div className="flex mt-5 bg-gray-100 rounded-xl p-1 gap-1">
          {["Posisi", "Pending", "Riwayat"].map((tab, i) => (
            <div
              key={tab}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg text-center ${
                i === 0 ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Mock empty state */}
        <div className="mt-4 text-center py-16 space-y-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-text-tertiary" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm text-text-tertiary">Belum ada posisi terbuka</p>
          <p className="text-xs text-text-tertiary">Mulai trading untuk melihat posisi Anda di sini</p>
        </div>
      </GatedContent>
    </div>
  );
}
