"use client";

import { useState, useEffect } from "react";
import { useUpdateHolding } from "@/hooks/use-portfolio";
import type { HoldingItem } from "@/hooks/use-portfolio";
import { useToast } from "@/components/paper-trading/toast";

interface EditHoldingFormProps {
  holding: HoldingItem;
  open: boolean;
  onClose: () => void;
}

export function EditHoldingForm({ holding, open, onClose }: EditHoldingFormProps) {
  const [buyPrice, setBuyPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const updateHolding = useUpdateHolding();
  const { toast } = useToast();

  useEffect(() => {
    if (open && holding) {
      setBuyPrice(String(holding.buyPrice));
      setQuantity(String(Math.floor(holding.quantity / 100)));
      setBuyDate(holding.buyDate);
      setNotes(holding.notes ?? "");
    }
  }, [open, holding]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await updateHolding.mutateAsync({
        ticker: holding.ticker,
        buyPrice: parseFloat(buyPrice),
        quantity: parseInt(quantity, 10),
        buyDate,
        notes: notes || null,
      });
      toast(`${holding.ticker.replace(".JK", "")} berhasil diupdate`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengupdate";
      setError(msg);
      toast(msg, "error");
    }
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
              backgroundImage: "linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">Edit {holding.ticker.replace(".JK", "")}</h3>
              </div>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
                Harga Beli
              </label>
              <input
                type="number"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                step="any"
                min="0"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
                Jumlah Lot
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
              Tanggal Beli
            </label>
            <input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
              Catatan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-mono bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="press-scale flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateHolding.isPending}
              className="press-scale flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {updateHolding.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
