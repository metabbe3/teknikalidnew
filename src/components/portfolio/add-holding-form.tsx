"use client";

import { useState, useRef, useEffect } from "react";
import { useAddHolding } from "@/hooks/use-portfolio";
import { IDX_STOCKS } from "@/lib/constants";
import { useToast } from "@/components/paper-trading/toast";

interface AddHoldingFormProps {
  open: boolean;
  onClose: () => void;
}

export function AddHoldingForm({ open, onClose }: AddHoldingFormProps) {
  const [ticker, setTicker] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(true);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addHolding = useAddHolding();
  const { toast } = useToast();

  const searchResults = IDX_STOCKS.filter(
    (s) =>
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const selectedStock = IDX_STOCKS.find((s) => s.ticker === ticker);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTicker("");
      setBuyPrice("");
      setQuantity("");
      setBuyDate("");
      setNotes("");
      setError("");
      setSearchQuery("");
      setSearchOpen(true);
      setHighlightIndex(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  if (!open) return null;

  const selectStock = (t: string) => {
    setTicker(t);
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      selectStock(searchResults[highlightIndex].ticker);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await addHolding.mutateAsync({
        ticker,
        buyPrice: parseFloat(buyPrice),
        quantity: parseInt(quantity, 10),
        buyDate,
        notes: notes || undefined,
      });
      toast(`${ticker.replace(".JK", "")} ditambahkan ke portofolio`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambah saham";
      setError(msg);
      toast(msg, "error");
    }
  };

  const totalEstimate = buyPrice && quantity && parseInt(quantity) > 0 && parseFloat(buyPrice) > 0
    ? parseFloat(buyPrice) * parseInt(quantity) * 100
    : 0;

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
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Tambah Saham</h3>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Stock search */}
          {!ticker ? (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                    setHighlightIndex(0);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Cari saham... (misal: BBCA, Bank Central)"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50"
                  autoFocus
                />
              </div>

              {searchOpen && searchQuery.length > 0 && searchResults.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((stock, idx) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      onClick={() => selectStock(stock.ticker)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        idx === highlightIndex ? "bg-teal-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono font-bold text-teal-600">
                          {stock.ticker.replace(".JK", "").slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-gray-900">
                          {stock.ticker.replace(".JK", "")}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{stock.name}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-gray-300 shrink-0">{stock.sector}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchOpen && searchQuery.length > 0 && searchResults.length === 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg p-4 text-center">
                  <p className="text-xs text-gray-400">Saham tidak ditemukan</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-teal-600">
                  {ticker.replace(".JK", "").slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-semibold text-gray-900">
                  {ticker.replace(".JK", "")}
                </p>
                <p className="text-[11px] text-gray-400 truncate">{selectedStock?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTicker("");
                  setSearchQuery("");
                  setSearchOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="press-scale text-[10px] font-mono font-semibold text-teal-600 px-2.5 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Ganti
              </button>
            </div>
          )}

          {/* Price + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
                Harga Beli / Lembar
              </label>
              <input
                type="number"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="9500"
                step="any"
                min="0"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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
                placeholder="100"
                min="1"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                required
              />
              {quantity && parseInt(quantity) > 0 && (
                <p className="text-[10px] text-gray-300 mt-1 font-mono">
                  = {(parseInt(quantity) * 100).toLocaleString("id-ID")} lembar
                </p>
              )}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
              Tanggal Beli
            </label>
            <input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1 font-semibold">
              Catatan (opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dibeli karena..."
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-mono bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Estimated total */}
          {totalEstimate > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
              <span className="text-xs text-gray-400 font-mono">Estimasi Total</span>
              <span className="text-sm font-mono font-bold text-gray-900 tabular-nums">
                Rp {totalEstimate.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={addHolding.isPending || !ticker}
            className="press-scale w-full py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {addHolding.isPending ? "Menyimpan..." : "Tambah ke Portofolio"}
          </button>
        </form>
      </div>
    </div>
  );
}
