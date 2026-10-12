"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseAiText, shareAiStock } from "@/components/stock/stock-ai-shared";

/**
 * Modal AI untuk stock-card di halaman /stocks — analisa + tanya saham
 * tanpa pindah halaman. Data diambil dari endpoint ringkas /api/ai/stock
 * (ticker saja → server lengkapi indikator) supaya card list tetap ringan.
 */

function StructuredSummary({ summary, ticker, name }: { summary: string; ticker: string; name: string }) {
  const parsed = parseAiText(summary);
  const [shareState, setShareState] = useState<"idle" | "ok" | "copied" | "fail">("idle");

  async function onShare() {
    const r = await shareAiStock(name, ticker, parsed);
    setShareState(r === "shared" ? "ok" : r === "copied" ? "copied" : "fail");
    setTimeout(() => setShareState("idle"), 2000);
  }

  // Fallback kalau model tak ikut format — render polos
  if (!parsed.ringkasan && parsed.insights.length === 0) {
    return <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{parsed.raw}</div>;
  }

  return (
    <div className="space-y-4">
      {parsed.ringkasan && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">✨ AI Summary</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{parsed.ringkasan}</p>
        </div>
      )}

      {parsed.insights.length > 0 && (
        <div className="rounded-lg bg-bg-tertiary/60 border border-border p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Insight</p>
          <ul className="space-y-1.5">
            {parsed.insights.map((i, idx) => (
              <li key={idx} className="text-[13px] text-text-secondary leading-relaxed flex gap-1.5">
                <span className="text-accent shrink-0">•</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsed.drivers.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Key Drivers</p>
          <ul className="space-y-1.5">
            {parsed.drivers.map((d, idx) => (
              <li key={idx} className="text-[13px] text-text-secondary leading-relaxed flex gap-1.5">
                <span className="text-bullish shrink-0">▸</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsed.level && (
        <div className="text-[12px] text-text-tertiary border-t border-border pt-2.5 font-medium">
          📍 {parsed.level}
        </div>
      )}

      <button
        onClick={onShare}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10 transition-colors"
      >
        {shareState === "ok" ? "✓ Terbagikan" : shareState === "copied" ? "✓ Tersalin ke clipboard" : shareState === "fail" ? "Gagal membagikan" : "📤 Bagikan Analisa"}
      </button>
      <p className="text-[10px] text-text-tertiary text-center">Data teknikal, bukan rekomendasi beli — teknikal.id</p>
    </div>
  );
}

export function StockAiModalButton({ ticker, name }: { ticker: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 min-h-11 sm:min-h-0 text-xs font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-all press-scale"
        aria-label={`Analisa AI ${name}`}
      >
        <span aria-hidden="true">✨</span> Analisa AI
      </button>
      {open && <StockAiModal ticker={ticker} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

export function StockAiModal({ ticker, name, onClose }: { ticker: string; name: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "summarize", ticker, name }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.error === "AI sedang tidak tersedia" ? "AI sedang tidak tersedia — coba lagi nanti." : "Gagal memuat analisa.");
        } else {
          setSummary(json.text);
        }
      } catch {
        if (!cancelled) setError("Koneksi bermasalah — coba lagi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticker, name]);

  // Close on Escape + lock scroll
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  async function ask() {
    if (!question.trim() || asking) return;
    setAsking(true); setAnswer(null);
    try {
      const res = await fetch("/api/ai/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ask", ticker, name, question }),
      });
      const json = await res.json();
      setAnswer(res.ok && json.ok ? json.text : `⚠ ${json.error ?? "Gagal"}`);
    } catch {
      setAnswer("⚠ Koneksi bermasalah.");
    } finally {
      setAsking(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Analisa AI ${name}`}
    >
      <div
        ref={dialogRef}
        className="bg-bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl max-h-[85vh] flex flex-col animate-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">✨ Analisa AI</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">AI</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary text-text-secondary"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-3 pb-1 shrink-0">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-text-tertiary font-mono">{ticker}</p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {loading && (
            <div className="space-y-2 py-2">
              <div className="h-3 bg-bg-tertiary rounded animate-pulse w-full" />
              <div className="h-3 bg-bg-tertiary rounded animate-pulse w-11/12" />
              <div className="h-3 bg-bg-tertiary rounded animate-pulse w-4/5" />
              <p className="text-[11px] text-text-tertiary pt-2">Menganalisa {name}…</p>
            </div>
          )}
          {error && <p className="text-sm text-bearish">{error}</p>}
          {summary && <StructuredSummary summary={summary} ticker={ticker} name={name} />}

          {askOpen ? (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
                  placeholder={`Tanya apa saja soal ${name}…`}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-bg-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  maxLength={300}
                />
                <button
                  onClick={ask}
                  disabled={asking || !question.trim()}
                  className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
                >
                  {asking ? "…" : "Kirim"}
                </button>
              </div>
              {answer && <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{answer}</p>}
            </div>
          ) : (
            summary && (
              <button
                onClick={() => setAskOpen(true)}
                className="text-xs text-accent font-medium hover:underline"
              >
                💬 Tanya saham ini…
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
