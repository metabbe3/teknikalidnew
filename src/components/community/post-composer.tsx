"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IDX_STOCKS } from "@/lib/constants";
import { useCreatePost } from "@/hooks/use-posts";

interface PostComposerProps {
  onPostCreated?: () => void;
}

type PredictionDirection = "bullish" | "bearish" | "neutral";

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const { status } = useSession();
  const [content, setContent] = useState("");
  const [tickerTag, setTickerTag] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [stockSearchOpen, setStockSearchOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [predictionDirection, setPredictionDirection] = useState<PredictionDirection | null>(null);
  const [predictionTarget, setPredictionTarget] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const stockSearchRef = useRef<HTMLDivElement>(null);

  const createPost = useCreatePost();

  const filteredTickers = IDX_STOCKS.filter((s) =>
    s.ticker.toLowerCase().includes(filterText.toLowerCase()) || s.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const stockSearchResults = IDX_STOCKS.filter((s) =>
    s.ticker.toLowerCase().includes(stockSearchQuery.toLowerCase()) || s.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        stockSearchRef.current &&
        !stockSearchRef.current.contains(e.target as Node)
      ) {
        setStockSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const dollarMatch = textBeforeCursor.match(/\$([A-Z]*)$/);

      if (dollarMatch) {
        setFilterText(dollarMatch[1]);
        setShowSuggestions(true);
        setSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    },
    []
  );

  const selectTicker = useCallback(
    (ticker: string) => {
      setTickerTag(ticker);
      setContent((prev) => prev.replace(/\$[A-Z]*$/, `$${ticker.replace(/\.JK$/, "")}`));
      setShowSuggestions(false);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || filteredTickers.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((i) => Math.min(i + 1, filteredTickers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        selectTicker(filteredTickers[suggestionIndex].ticker);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, filteredTickers, suggestionIndex, selectTicker]
  );

  const selectStockFromSearch = (ticker: string) => {
    setTickerTag(ticker);
    setStockSearchOpen(false);
    setStockSearchQuery("");
  };

  const removeTicker = () => {
    setTickerTag(null);
    setPredictionDirection(null);
    setPredictionTarget("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || createPost.isPending) return;

    createPost.mutate(
      {
        content: content.trim(),
        tickerTag,
        predictionDirection: tickerTag ? predictionDirection : null,
        predictionTarget: tickerTag && predictionTarget ? Number(predictionTarget) : null,
      },
      {
        onSuccess: () => {
          setContent("");
          setTickerTag(null);
          setPredictionDirection(null);
          setPredictionTarget("");
          onPostCreated?.();
        },
      }
    );
  };

  if (status !== "authenticated") {
    return (
      <div
        className="bg-bg-card rounded-xl depth-shadow-strong border border-border p-6 text-center"
        style={{ borderTop: "3px solid #0d9488" }}
      >
        <p className="text-text-secondary text-sm">
          Masuk untuk berpartisipasi dalam diskusi
        </p>
        <a
          href="/auth/signin"
          className="inline-block mt-3 px-5 py-2 rounded-full bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          Masuk
        </a>
      </div>
    );
  }

  const dirOptions: { value: PredictionDirection; label: string; activeClass: string }[] = [
    { value: "bullish", label: "Bullish", activeClass: "bg-teal-50 text-teal-700 border-teal-300" },
    { value: "bearish", label: "Bearish", activeClass: "bg-red-50 text-red-700 border-red-300" },
    { value: "neutral", label: "Netral", activeClass: "bg-stone-100 text-stone-600 border-stone-300" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-card rounded-xl depth-shadow-strong border border-border p-4"
      style={{ borderTop: "3px solid #0d9488" }}
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Tulis post..."
          maxLength={1000}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/40"
        />

        {showSuggestions && filteredTickers.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 bottom-full mb-1 z-20 w-56 max-h-48 overflow-y-auto bg-bg-card rounded-xl depth-shadow border border-border py-1"
          >
            {filteredTickers.slice(0, 8).map((stock, idx) => (
              <button
                key={stock.ticker}
                type="button"
                onClick={() => selectTicker(stock.ticker)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  idx === suggestionIndex
                    ? "bg-bg-hover text-accent"
                    : "text-text-primary hover:bg-bg-hover"
                }`}
              >
                ${stock.ticker.replace(/\.JK$/, "")} <span className="text-text-tertiary text-xs">{stock.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stock attachment + prediction */}
      {tickerTag && (
        <div className="mt-2.5 rounded-lg border border-border bg-bg-primary">
          {/* Stock header with colored accent */}
          <div className="flex items-center justify-between px-3 py-2 bg-accent/[0.03] border-b border-border/50">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 5-9" />
              </svg>
              ${tickerTag.replace(/\.JK$/, "")}
            </span>
            <button
              type="button"
              onClick={removeTicker}
              className="p-1 rounded hover:text-bearish hover:bg-bearish/10 transition-colors text-text-tertiary"
              aria-label="Hapus saham"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Prediction direction */}
          <div className="px-3 py-2.5 space-y-2.5">
            <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Prediksi harga</span>
            <div className="flex gap-1.5">
              {dirOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPredictionDirection(predictionDirection === opt.value ? null : opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all duration-150 ${
                    predictionDirection === opt.value
                      ? opt.activeClass
                      : "border-border text-text-tertiary hover:border-border-light hover:bg-bg-hover"
                  }`}
                >
                  <span className="text-sm" aria-hidden="true">{opt.value === "bullish" ? "↗" : opt.value === "bearish" ? "↘" : "→"}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Target price */}
            {predictionDirection && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Target</span>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs font-medium text-text-tertiary bg-bg-card px-1.5 py-0.5 rounded border border-border">Rp</span>
                  <input
                    type="number"
                    value={predictionTarget}
                    onChange={(e) => setPredictionTarget(e.target.value)}
                    placeholder="Opsional"
                    min="1"
                    className="flex-1 px-2 py-1 text-xs font-medium rounded-lg border border-border bg-bg-card tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          {tickerTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
              ${tickerTag.replace(/\.JK$/, "")}
              <button
                type="button"
                onClick={removeTicker}
                className="p-0.5 -m-0.5 rounded hover:text-bearish hover:bg-bearish/10 transition-colors"
                aria-label="Hapus tag"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          )}
          <span
            className={`text-xs ${
              content.length > 900 ? "text-bearish" : "text-text-secondary"
            }`}
          >
            {content.length}/1000
          </span>
        </div>

        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={() => {
              if (tickerTag) return;
              setStockSearchOpen(!stockSearchOpen);
              setStockSearchQuery("");
            }}
            className={`p-2 rounded-lg transition-colors ${
              tickerTag
                ? "text-accent bg-accent/10"
                : "text-text-secondary hover:text-accent hover:bg-bg-hover"
            }`}
            title={tickerTag ? "Saham sudah dilampirkan" : "Lampirkan saham"}
            aria-label="Lampirkan saham"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 5-9" />
            </svg>
          </button>

          {stockSearchOpen && (
            <div
              ref={stockSearchRef}
              className="absolute right-0 bottom-full mb-2 z-20 w-64 bg-bg-card rounded-xl depth-shadow border border-border p-2"
            >
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value.toUpperCase())}
                placeholder="Cari saham..."
                autoFocus
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {stockSearchResults.length > 0 && (
                <div className="mt-1.5 max-h-40 overflow-y-auto">
                  {stockSearchResults.map((stock) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      onClick={() => selectStockFromSearch(stock.ticker)}
                      className="w-full text-left px-2.5 py-1.5 text-sm text-text-primary hover:bg-bg-hover hover:text-accent rounded-lg transition-colors"
                    >
                      ${stock.ticker.replace(/\.JK$/, "")} <span className="text-text-tertiary text-xs">{stock.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {stockSearchQuery && stockSearchResults.length === 0 && (
                <p className="py-3 text-center text-xs text-text-tertiary">Tidak ditemukan</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!content.trim() || createPost.isPending}
            className="px-5 py-2 rounded-full bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPost.isPending ? "Mengirim..." : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
