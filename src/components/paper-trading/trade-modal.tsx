"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { IDX_STOCKS } from "@/lib/constants";
import { STRATEGY_TAGS } from "./constants";
import { usePlaceOrder } from "@/hooks/use-paper-trading";
import { useToast } from "./toast";

const MOODS = [
  { value: "CONFIDENT", label: "Yakin", icon: "💪" },
  { value: "UNCERTAIN", label: "Ragu", icon: "🤔" },
  { value: "GREEDY", label: "Serakah", icon: "🤑" },
  { value: "FEARFUL", label: "Takut", icon: "😰" },
  { value: "NEUTRAL", label: "Netral", icon: "😐" },
];

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

interface TradeModalProps {
  onClose: () => void;
  initialTicker?: string;
  initialSide?: "BUY" | "SELL";
}

export function TradeModal({ onClose, initialTicker, initialSide }: TradeModalProps) {
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => { setMounted(true); }, []);

  const [side, setSide] = useState<"BUY" | "SELL">(initialSide ?? "BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [ticker, setTicker] = useState(initialTicker ?? "");
  const [tickerName, setTickerName] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(!initialTicker);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [showJournal, setShowJournal] = useState(false);

  const placeOrder = usePlaceOrder();
  const { toast } = useToast();

  useEffect(() => {
    if (initialTicker) {
      const stock = IDX_STOCKS.find((s) => s.ticker === initialTicker);
      setTickerName(stock?.name ?? "");
    }
  }, [initialTicker]);

  const filteredStocks = IDX_STOCKS.filter(
    (s) =>
      (search.length > 0 &&
        (s.ticker.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase()))) ??
      false
  ).slice(0, 10);

  const selectStock = (t: string, name: string) => {
    setTicker(t);
    setTickerName(name);
    setSearch("");
    setShowSearch(false);
  };

  const lots = Number(quantity) || 0;
  const shares = lots * 100;
  const pricePerShare = orderType === "MARKET" ? (Number(price) || 0) : (Number(price) || 0);
  const estimatedTotal = pricePerShare * shares;

  const adjustQuantity = (delta: number) => {
    const current = Number(quantity) || 0;
    const next = Math.max(0, current + delta);
    setQuantity(next > 0 ? String(next) : "");
  };

  const handleSubmit = () => {
    if (!ticker || lots <= 0 || (orderType !== "MARKET" && pricePerShare <= 0)) return;

    placeOrder.mutate(
      {
        stockTicker: ticker,
        side,
        orderType,
        quantity: lots,
        targetPrice: orderType !== "MARKET" ? pricePerShare : undefined,
        reason: reason || null,
        strategyTags: selectedTags.length > 0 ? selectedTags : null,
        mood,
      },
      {
        onSuccess: () => {
          toast(side === "BUY" ? `Berhasil beli ${lots} lot ${ticker.replace(".JK", "")}` : `Berhasil jual ${lots} lot ${ticker.replace(".JK", "")}`);
          setTimeout(onClose, 600);
        },
        onError: (err) => toast((err as Error).message, "error"),
      }
    );
  };

  const canSubmit = ticker && lots > 0 && (orderType === "MARKET" || pricePerShare > 0);

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto bottom-sheet-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Trade Simulasi</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Side toggle — full width, color-coded */}
          <div className="flex rounded-xl overflow-hidden bg-gray-100 p-1">
            <button
              onClick={() => setSide("BUY")}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                side === "BUY"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Beli
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                side === "SELL"
                  ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Jual
            </button>
          </div>

          {/* Stock search */}
          <div className="relative">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Saham</label>
            {ticker && !showSearch ? (
              <div className="mt-1 flex items-center gap-2 p-2.5 rounded-xl bg-teal-50/50 border border-teal-200/50">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-mono font-bold text-teal-600">{ticker.replace(".JK", "").slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-900">{ticker.replace(".JK", "")}</span>
                  <span className="text-xs text-gray-400 ml-1.5">{tickerName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setTicker(""); setTickerName(""); setShowSearch(true); }}
                  className="press-scale text-[10px] font-semibold text-teal-600 px-2 py-1 rounded-md hover:bg-teal-100 transition-colors"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <div className="mt-1 relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik ticker atau nama..."
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/40"
                />
                {search.length > 0 && (
                  <div className="absolute z-10 w-full top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
                    {filteredStocks.map((s) => (
                      <button
                        key={s.ticker}
                        onClick={() => selectStock(s.ticker, s.name)}
                        className="w-full text-left px-4 py-2.5 hover:bg-teal-50/50 transition-colors"
                      >
                        <span className="text-sm font-bold text-gray-900">{s.ticker.replace(".JK", "")}</span>
                        <span className="text-xs text-gray-400 ml-2">{s.name}</span>
                      </button>
                    ))}
                    {filteredStocks.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400">Saham tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order type pills */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Tipe Order</label>
            <div className="flex gap-2 mt-1">
              {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    orderType === t
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {t === "MARKET" ? "Market" : t === "LIMIT" ? "Limit" : "Stop"}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity with stepper */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Jumlah Lot</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => adjustQuantity(-1)}
                className="press-scale w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1 text-center border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/40 tabular-nums"
              />
              <button
                onClick={() => adjustQuantity(1)}
                className="press-scale w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>
            {lots > 0 && (
              <div className="text-[11px] text-gray-400 mt-1.5 text-center">
                = <span className="font-mono font-semibold text-gray-500">{shares.toLocaleString("id-ID")}</span> lembar saham
              </div>
            )}
          </div>

          {/* Price (for limit/stop) */}
          {orderType !== "MARKET" && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                Harga Target <span className="text-gray-300">(per lembar)</span>
              </label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/40 tabular-nums"
              />
            </div>
          )}

          {/* Estimated total */}
          {estimatedTotal > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Estimasi Total</div>
              <div className="text-xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
                {formatRupiah(estimatedTotal)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {lots} lot &times; {formatRupiah(pricePerShare)} &times; 100 lembar
              </div>
            </div>
          )}

          {/* Journal toggle */}
          <button
            onClick={() => setShowJournal(!showJournal)}
            className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-800 py-2 transition-colors"
          >
            <span className="font-medium">Jurnal Trade</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" className={`transition-transform duration-200 ${showJournal ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showJournal && (
            <div className="space-y-3 pb-1 slide-down-enter">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Alasan Trade</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Kenapa kamu memutuskan trade ini?"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/40"
                />
                <div className="text-[10px] text-gray-300 text-right mt-0.5">{reason.length}/500</div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Strategi</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {STRATEGY_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-full transition-all duration-150 font-medium ${
                        selectedTags.includes(tag)
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Mood</label>
                <div className="flex gap-1.5 mt-1">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMood(mood === m.value ? null : m.value)}
                      className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all duration-150 ${
                        mood === m.value
                          ? "bg-teal-50 border border-teal-200 scale-105"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-[9px] text-gray-500 font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || placeOrder.isPending}
            className={`press-scale w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              side === "BUY"
                ? "bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
                : "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
            }`}
          >
            {placeOrder.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Memproses...
              </span>
            ) : side === "BUY" ? (
              `Beli ${lots > 0 ? `${lots} lot ` : ""}${ticker ? ticker.replace(".JK", "") : "Saham"}`
            ) : (
              `Jual ${lots > 0 ? `${lots} lot ` : ""}${ticker ? ticker.replace(".JK", "") : "Saham"}`
            )}
          </button>

          {placeOrder.isError && (
            <p className="text-xs text-red-500 text-center font-medium">
              {(placeOrder.error as Error).message}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
