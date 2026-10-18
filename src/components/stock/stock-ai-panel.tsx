"use client";

import { useState } from "react";
import { useToast } from "@/components/paper-trading/toast";
import { parseAiText, shareAiStock } from "@/components/stock/stock-ai-shared";
import { Sparkles } from "lucide-react";

/**
 * Tombol "✨ Ringkas AI" + panel "Tanya saham ini" — halaman detail saham.
 * Semua angka dikirim dari props (data server-side halaman); model MLX lokal
 * hanya merangkai narasi. Endpoint: /api/ai/stock (proxy → MLX 127.0.0.1:8765 host).
 */

export interface StockAiData {
  ticker: string;
  name: string;
  sector?: string | null;
  subSector?: string | null;
  industry?: string | null;
  businessActivity?: string | null;
  close: number | null;
  changePercent: number | null;
  prevClose?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  volume?: number | null;
  avgVol20?: number | null;
  rsi14?: number | null;
  macdLine?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  ema12?: number | null;
  ema26?: number | null;
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
  adx?: number | null;
  atr?: number | null;
  stochK?: number | null;
  stochD?: number | null;
  vwap?: number | null;
  obvTrend?: string | null;
  supertrend?: number | null;
  emaCrossSignal?: string | null;
  emaCrossDate?: string | null;
  smaCrossSignal?: string | null;
  support?: number | null;
  resistance?: number | null;
  signalLabel?: string | null;
  isGorengan?: boolean;
  high52?: number | null;
  low52?: number | null;
  change5d?: number | null;
  change20d?: number | null;
  listedShares?: number | null;
  foreignOwnershipPercent?: number | null;
  listingDate?: string | null;
}


function StructuredPanelSummary({ summary, ticker, name }: { summary: string; ticker: string; name: string }) {
  const parsed = parseAiText(summary);
  const [shareState, setShareState] = useState<"idle" | "ok" | "copied" | "fail">("idle");

  async function onShare() {
    const r = await shareAiStock(name, ticker, parsed);
    setShareState(r === "shared" ? "ok" : r === "copied" ? "copied" : "fail");
    setTimeout(() => setShareState("idle"), 2000);
  }

  if (!parsed.ringkasan && parsed.insights.length === 0) {
    return <p className="mt-3 text-sm leading-relaxed text-text-secondary whitespace-pre-line">{parsed.raw}</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {parsed.ringkasan && (
        <p className="text-sm leading-relaxed text-text-secondary">{parsed.ringkasan}</p>
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
        <div className="text-[12px] text-text-tertiary font-medium">📍 {parsed.level}</div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 text-accent text-xs font-medium hover:bg-accent/10 transition-colors"
        >
          {shareState === "ok" ? "✓ Terbagikan" : shareState === "copied" ? "✓ Tersalin" : shareState === "fail" ? "Gagal" : "📤 Bagikan"}
        </button>
        <p className="text-[10px] text-text-tertiary text-right">Data teknikal, bukan rekomendasi beli</p>
      </div>
    </div>
  );
}

export function StockAiPanel({ data }: { data: StockAiData }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const { toast } = useToast();

  async function runSummarize() {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/ai/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mode: "summarize" }),
      });
      const json = await res.json();
      if (!res.ok || !json.text) throw new Error(json.error || "AI gagal");
      setSummary(json.text);
    } catch (e) {
      toast(e instanceof Error ? e.message : "AI sedang tidak tersedia");
    } finally {
      setLoading(false);
    }
  }

  async function runAsk() {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mode: "ask", question }),
      });
      const json = await res.json();
      if (!res.ok || !json.text) throw new Error(json.error || "AI gagal");
      setAnswer(json.text);
    } catch (e) {
      toast(e instanceof Error ? e.message : "AI sedang tidak tersedia");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-bg-card border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Analisa AI</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
            AI
          </span>
        </div>
        <button
          onClick={runSummarize}
          disabled={loading}
          className="press-scale inline-flex items-center gap-1.5 text-xs font-bold bg-accent text-white px-3 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Merangkum…" : summary ? "Ringkas ulang" : "Ringkas saham ini"}
        </button>
      </div>

      {loading && <div className="mt-3 skeleton-shimmer h-16 rounded-lg" />}

      {summary && !loading && (
        <StructuredPanelSummary summary={summary} ticker={data.ticker} name={data.name} />
      )}

      {!summary && !loading && (
        <p className="mt-2 text-xs text-text-tertiary">
          Ringkasan cepat arah harga, volume, indikator kunci, dan level yang diawasi — dibuat model
          AI lokal dari data halaman ini.
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        {askOpen ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !asking && runAsk()}
                placeholder={`Tanya apa saja tentang ${data.ticker.replace(".JK", "")}…`}
                className="flex-1 min-h-11 rounded-lg bg-bg-primary border border-border px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                maxLength={500}
              />
              <button
                onClick={runAsk}
                disabled={asking || !question.trim()}
                className="press-scale text-xs font-bold bg-bg-primary border border-border px-3 rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
              >
                {asking ? "…" : "Kirim"}
              </button>
            </div>
            {asking && <div className="skeleton-shimmer h-10 rounded-lg" />}
            {answer && !asking && (
              <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line rounded-lg bg-bg-primary p-3">
                {answer}
              </p>
            )}
            <button
              onClick={() => {
                setAskOpen(false);
                setAnswer(null);
                setQuestion("");
              }}
              className="text-[11px] text-text-tertiary hover:text-text-secondary"
            >
              tutup
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAskOpen(true)}
            className="text-xs font-medium text-accent hover:text-accent/80 press-scale"
          >
            💬 Tanya saham ini…
          </button>
        )}
      </div>
    </div>
  );
}
