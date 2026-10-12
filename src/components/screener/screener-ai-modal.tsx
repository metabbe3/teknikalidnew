"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tanya AI Screener — tombol di /stocks, modal chat bahasa manusia.
 * Server ambil hasil screener preset dr DB, MLX lokal jawab + auto-link ticker.
 */

const DEFAULT_QUESTIONS = [
  "Saham apa yang lagi oke hari ini?",
  "Ada yang oversold murah?",
  "Volume lagi ramai di mana?",
  "Golden cross ada nggak?",
  "Saham blue chip yang aman?",
  "Dividen tinggi ada?",
  "Yang lagi hype apa aja?",
];

/**
 * Render jawaban MLX — ANTI-FRAGILE: tidak peduli format model ([BOGA], BOGA[/stocks/BOGA],
 * BOGA(/stocks/BOGA), atau BOGA polos), semuanya dibersihkan jadi teks polos dulu,
 * lalu ticker yang DIKETAHUI dari data DB di-linkify otomatis. Model tak bisa salah format.
 */
function cleanAnswerText(raw: string): string {
  return raw
    // TICKER[/stocks/TICKER] → TICKER (dedup nempel — dicek PERTAMA sebelum bracket umum)
    .replace(/([A-Z0-9.^-]{2,12})\[\/?stocks\/[A-Z0-9.^-]{2,12}\]/g, "$1")
    // [TICKER]/stocks/TICKER → TICKER
    .replace(/\[([A-Z0-9.^-]{2,12})\]\/?stocks\/[A-Z0-9.^-]{2,12}/g, "$1")
    // [TICKER](/stocks/ANY) → TICKER
    .replace(/\[([A-Z0-9.^-]{2,12})\]\([^)]*\)/g, "$1")
    // [/stocks/TICKER] → TICKER
    .replace(/\[\/?stocks\/([A-Z0-9.^-]{2,12})\]/g, "$1")
    // [TICKER] → TICKER
    .replace(/\[([A-Z0-9.^-]{2,12})\]/g, "$1")
    // TICKER(/stocks/ANY) → TICKER
    .replace(/([A-Z0-9.^-]{2,12})\(\/?stocks\/[A-Z0-9.^-]+\)/g, "$1")
    // ** bold md
    .replace(/\*\*/g, "");
}

function AiAnswer({ text, tickers }: { text: string; tickers: string[] }) {
  const cleaned = cleanAnswerText(text);
  const known = new Set(tickers);
  const lines = cleaned.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // split per kata; kata = ticker dikenal & huruf kapital penuh → link
        const tokens = line.split(/(\s+)/);
        return (
          <p key={i} className="text-sm leading-relaxed text-text-primary">
            {tokens.map((tok, j) => {
              const bare = tok.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, ""); // strip punct tepi
              if (known.has(bare)) {
                return (
                  <a
                    key={j}
                    href={`/stocks/${bare}.JK`}
                    className="font-mono text-xs font-bold text-accent hover:underline bg-accent/10 rounded px-1.5 py-0.5"
                  >
                    {tok}
                  </a>
                );
              }
              return <span key={j}>{tok.replace(/^- /, "• ")}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export function ScreenerAiButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [meta, setMeta] = useState<{ presetLabel?: string; matched?: number } | null>(null);
  const [tableStocks, setTableStocks] = useState<{ ticker: string; name: string; close: number | null; changePercent: number | null; signalScore: number | null }[]>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setMeta(null);
    setTableStocks([]);
    try {
      const res = await fetch("/api/ai/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal");
      setAnswer(data.text ?? "");
      setMeta({ presetLabel: data.presetLabel, matched: data.matched });
      setTableStocks(Array.isArray(data.stocks) ? data.stocks : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi error");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Tanya AI"
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors press-scale"
      >
        ✨ Tanya AI
      </button>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[85vh] flex flex-col animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-sm font-bold">✨ Tanya AI</p>
            <p className="text-[11px] text-text-tertiary">Screener bahasa manusia</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary text-text-secondary"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {/* Default questions */}
          <div className="flex flex-wrap gap-2">
            {DEFAULT_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => { setQuestion(q); ask(q); }}
                disabled={loading}
                className="rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3 py-2">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
                <div className="ai-progress absolute inset-y-0 left-0 w-1/3 rounded-full bg-accent" />
              </div>
              <div className="h-3 bg-bg-tertiary rounded animate-pulse w-full" />
              <div className="h-3 bg-bg-tertiary rounded animate-pulse w-11/12" />
              <p className="text-[11px] text-text-tertiary pt-1">🧠 Membaca hasil screener… ±8 dtk</p>
            </div>
          )}

          {error && <p className="text-sm text-bearish">{error}</p>}

          {answer && (
            <div className="space-y-3">
              {meta && (
                <p className="text-[11px] text-text-tertiary">
                  📊 Berdasarkan preset {meta.presetLabel} · {meta.matched} saham lolos
                </p>
              )}
              <AiAnswer text={answer} tickers={tableStocks.map((s) => s.ticker)} />

              {tableStocks.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-secondary text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                        <th className="px-3 py-2 font-semibold">Saham</th>
                        <th className="px-3 py-2 font-semibold text-right">Harga</th>
                        <th className="px-3 py-2 font-semibold text-right">Chg</th>
                        <th className="px-3 py-2 font-semibold text-right">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableStocks.slice(0, 10).map((s) => (
                        <tr key={s.ticker} className="border-t border-border hover:bg-bg-hover transition-colors">
                          <td className="px-3 py-2">
                            <a href={`/stocks/${s.ticker}.JK`} className="font-mono text-xs font-bold text-accent hover:underline">
                              {s.ticker}
                            </a>
                            <span className="ml-2 text-[11px] text-text-tertiary hidden sm:inline">{s.name}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{s.close != null ? new Intl.NumberFormat("id-ID").format(s.close) : "–"}</td>
                          <td className={`px-3 py-2 text-right font-mono text-xs ${(s.changePercent ?? 0) >= 0 ? "text-bullish" : "text-bearish"}`}>
                            {s.changePercent != null ? `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%` : "–"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-text-secondary">{s.signalScore != null ? s.signalScore.toFixed(2) : "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableStocks.length > 10 && (
                    <p className="px-3 py-2 text-[11px] text-text-tertiary bg-bg-secondary">
                      +{tableStocks.length - 10} lainnya — lihat semua di tab Screener
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(question); }}
            placeholder="Tanya apa saja tentang screener…"
            className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
          <button
            onClick={() => ask(question)}
            disabled={loading || !question.trim()}
            className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            Tanya
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
