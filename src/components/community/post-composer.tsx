"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IDX_STOCKS } from "@/lib/constants";
import { useCreatePost } from "@/hooks/use-posts";
import { useMentionSearch, type MentionUser } from "@/hooks/use-mention-search";
import { EmojiPicker } from "./emoji-picker";

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
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pollMode, setPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const stockSearchRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  const { users: mentionUsers, isLoading: mentionLoading } = useMentionSearch(mentionQuery);

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
      if (
        mentionRef.current &&
        !mentionRef.current.contains(e.target as Node)
      ) {
        setMentionOpen(false);
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
      const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

      if (dollarMatch) {
        setFilterText(dollarMatch[1]);
        setShowSuggestions(true);
        setSuggestionIndex(0);
        setMentionOpen(false);
      } else if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionOpen(true);
        setMentionIndex(0);
        setShowSuggestions(false);
      } else {
        setShowSuggestions(false);
        setMentionOpen(false);
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

  const selectMention = useCallback(
    (user: MentionUser) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.slice(0, cursorPos);
      const replaceStart = textBeforeCursor.lastIndexOf("@");
      if (replaceStart === -1) return;

      const before = content.slice(0, replaceStart);
      const after = content.slice(cursorPos);
      const newContent = `${before}@${user.username} ${after}`;
      setContent(newContent);
      setMentionOpen(false);

      requestAnimationFrame(() => {
        const newPos = replaceStart + user.username.length + 2;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    },
    [content]
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);

      requestAnimationFrame(() => {
        const newPos = start + emoji.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    },
    [content]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Mention dropdown takes priority when open
      if (mentionOpen && mentionUsers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, mentionUsers.length - 1));
          return;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          selectMention(mentionUsers[mentionIndex]);
          return;
        } else if (e.key === "Escape") {
          setMentionOpen(false);
          return;
        }
      }

      // Stock ticker dropdown
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
    [showSuggestions, filteredTickers, suggestionIndex, selectTicker, mentionOpen, mentionUsers, mentionIndex, selectMention]
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
        pollOptions: pollMode ? pollOptions.filter((o) => o.trim()) : undefined,
      },
      {
        onSuccess: () => {
          setContent("");
          setTickerTag(null);
          setPredictionDirection(null);
          setPredictionTarget("");
          setMentionOpen(false);
          setPollMode(false);
          setPollOptions(["", ""]);
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

        {mentionOpen && (mentionUsers.length > 0 || mentionLoading) && (
          <div
            ref={mentionRef}
            className="absolute left-0 bottom-full mb-1 z-20 w-64 max-h-56 overflow-y-auto bg-bg-card rounded-xl depth-shadow border border-border py-1"
          >
            {mentionLoading ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">Mencari...</div>
            ) : (() => {
              const followed = mentionUsers.filter((u) => u.isFollowing);
              const others = mentionUsers.filter((u) => !u.isFollowing);
              let flatIdx = 0;
              return (
                <>
                  {followed.map((user) => {
                    const i = flatIdx++;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectMention(user)}
                        onMouseEnter={() => setMentionIndex(i)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                          i === mentionIndex
                            ? "bg-bg-hover"
                            : "hover:bg-bg-hover"
                        }`}
                      >
                        {user.image ? (
                          <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                            {(user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{user.name || user.username}</p>
                          <p className="text-[11px] text-text-tertiary">@{user.username}</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium shrink-0">Mengikuti</span>
                      </button>
                    );
                  })}
                  {followed.length > 0 && others.length > 0 && (
                    <div className="my-1 border-t border-border/50" />
                  )}
                  {others.map((user) => {
                    const i = flatIdx++;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectMention(user)}
                        onMouseEnter={() => setMentionIndex(i)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                          i === mentionIndex
                            ? "bg-bg-hover"
                            : "hover:bg-bg-hover"
                        }`}
                      >
                        {user.image ? (
                          <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                            {(user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{user.name || user.username}</p>
                          <p className="text-[11px] text-text-tertiary">@{user.username}</p>
                        </div>
                      </button>
                    );
                  })}
                </>
              );
            })()}
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

      {/* Poll creator */}
      {pollMode && (
        <div className="mt-2.5 rounded-lg border border-border bg-bg-primary p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Poll</span>
            <button
              type="button"
              onClick={() => { setPollMode(false); setPollOptions(["", ""]); }}
              className="p-1 rounded hover:text-bearish hover:bg-bearish/10 transition-colors text-text-tertiary"
              aria-label="Hapus poll"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...pollOptions];
                  newOpts[i] = e.target.value;
                  setPollOptions(newOpts);
                }}
                placeholder={`Opsi ${i + 1}`}
                maxLength={100}
                className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-border bg-bg-card focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                  className="p-1 text-text-tertiary hover:text-bearish transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button
              type="button"
              onClick={() => setPollOptions([...pollOptions, ""])}
              className="text-xs text-accent hover:underline font-medium"
            >
              + Tambah opsi
            </button>
          )}
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
          <EmojiPicker onSelect={insertEmoji} />
          <button
            type="button"
            onClick={() => { setPollMode(!pollMode); if (pollMode) setPollOptions(["", ""]); }}
            className={`p-2 rounded-lg transition-colors ${
              pollMode
                ? "text-teal-600 bg-teal-50"
                : "text-text-secondary hover:text-teal-600 hover:bg-bg-hover"
            }`}
            title="Tambah poll"
            aria-label="Tambah poll"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 11l2 2 4-4" />
            </svg>
          </button>
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
