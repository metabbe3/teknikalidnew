"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePortfolio, useDeleteHolding, usePortfolioSettings } from "@/hooks/use-portfolio";
import { PortfolioSummaryBar } from "@/components/portfolio/portfolio-summary";
import { PortfolioHealth } from "@/components/portfolio/portfolio-health";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { AddHoldingForm } from "@/components/portfolio/add-holding-form";
import { EditHoldingForm } from "@/components/portfolio/edit-holding-form";
import { ToastProvider, useToast } from "@/components/paper-trading/toast";

export default function PortfolioPage() {
  return (
    <ToastProvider>
      <PortfolioRouter />
    </ToastProvider>
  );
}

function PortfolioRouter() {
  const { data: session, status } = useSession();
  const { data: portfolio, isLoading } = usePortfolio();
  const deleteHolding = useDeleteHolding();
  const updateSettings = usePortfolioSettings();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editTicker, setEditTicker] = useState<string | null>(null);

  const editingHolding = portfolio?.holdings.find((h) => h.ticker === editTicker) ?? null;

  const handleTogglePrivacy = async () => {
    if (!portfolio) return;
    try {
      await updateSettings.mutateAsync(!portfolio.isPublic);
      toast(portfolio.isPublic ? "Portofolio diubah ke privat" : "Portofolio diubah ke publik");
    } catch {
      toast("Gagal mengubah pengaturan", "error");
    }
  };

  const handleDelete = async (ticker: string) => {
    try {
      await deleteHolding.mutateAsync(ticker);
      toast(`${ticker.replace(".JK", "")} dihapus dari portofolio`);
    } catch {
      toast("Gagal menghapus saham", "error");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton-shimmer h-20 rounded-2xl" />
        <div className="skeleton-shimmer h-10 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-28 rounded-xl" />
            ))}
          </div>
          <div className="skeleton-shimmer h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="relative rounded-2xl overflow-hidden inline-block">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(13,148,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10 p-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="1.5">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Portofolio Saya</h1>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
              Track saham kamu, lihat P&L real-time, dan pantau sinyal teknikal semua di satu tempat.
            </p>
            <Link
              href="/auth/signin"
              className="press-scale inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
            >
              Masuk untuk Mulai
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Gagal memuat portofolio</p>
      </div>
    );
  }

  const totalLots = portfolio.holdings.reduce((sum, h) => sum + Math.floor(h.quantity / 100), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Portofolio</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">
            {portfolio.holdings.length} saham · {totalLots.toLocaleString("id-ID")} lot · P&L real-time
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="press-scale flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah
        </button>
      </div>

      {/* Summary hero */}
      <PortfolioSummaryBar
        summary={portfolio.summary}
        isPublic={portfolio.isPublic}
        onTogglePrivacy={handleTogglePrivacy}
      />

      {/* Holdings + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <HoldingsTable
          holdings={portfolio.holdings}
          onEdit={(ticker) => setEditTicker(ticker)}
          onDelete={handleDelete}
        />
        {portfolio.holdings.length > 0 && (
          <PortfolioHealth summary={portfolio.summary} />
        )}
      </div>

      <AddHoldingForm open={showAdd} onClose={() => setShowAdd(false)} />
      {editingHolding && (
        <EditHoldingForm
          holding={editingHolding}
          open={!!editTicker}
          onClose={() => setEditTicker(null)}
        />
      )}
    </div>
  );
}
