"use client";

/**
 * AskAiFab (owner 30 Okt): floating action button "tanya apapun" — 1 tempat di SEMUA halaman.
 * - Khusus user LOGIN (owner mandate): anon tidak lihat FAB (entry AI anon tetap tombol inline existing).
 * - Mobile: FAB bulat kanan-bawah 56px (≥44px tap target); Desktop: pill kanan-bawah.
 * - Buka modal chat ringan → POST /api/ai/screener (mode MARKET, glm-flash + PasarSnapshot).
 * - Deteksi ticker 4-huruf di pertanyaan → auto redirect deep-link ke halaman saham
 *   (jawaban per-ticker terlengkap ada di /stocks/TICKER dgn chips kontekstual).
 * - Token warna teknikal.id semua; ikon lucide; state loading/empty/error lengkap.
 * - Z-index 30 (di bawah modal 50 & bottom-sheet FAB mobile 40) — tidak tabrakan TickerFab
 *   (bottom-24 mobile clearance).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sparkles, X, Send, ArrowUpRight } from "lucide-react";

const QUICK_CHIPS = [
  "Saham apa yang lagi oke hari ini?",
  "Kenapa IHSG turun/naik hari ini?",
  "Asing lagi borong saham apa?",
  "Saham sinyal terkuat sekarang?",
];

const ID_TICKER_RE = /\b([A-Z]{4})\b/g;

interface ChatItem {
  role: "user" | "ai";
  text: string;
  links?: { ticker: string }[];
}

export function AskAiFab() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Nudge halus: glow sekali 6s setelah mount (bukan popup — anti-annoying owner rule)
  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 6000);
    const t2 = setTimeout(() => setNudge(false), 12000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items, loading]);

  // Khusus login (owner 30 Okt). unauthenticated/loading → FAB tidak render.
  if (status !== "authenticated") return null;

  async function ask(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setItems((p) => [...p, { role: "user", text }]);
    setQ("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Gagal menjawab");
      // ekstrak ticker dari jawaban utk tombol deep-link
      const links = [...new Set((data.text as string).match(ID_TICKER_RE) ?? [])]
        .filter((t) => t !== "IHSG")
        .slice(0, 4)
        .map((ticker) => ({ ticker }));
      setItems((p) => [...p, { role: "ai", text: data.text, links }]);
    } catch {
      setError("Sambungan AI terganggu — coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup tanya AI" : "Tanya AI apa saja"}
        data-engagement="fab_ask_ai"
        className={`fixed z-30 bottom-24 md:bottom-6 right-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent text-white shadow-lg hover:bg-accent/90 active:scale-95 transition
        h-14 px-4 md:h-11 md:px-5 text-sm font-semibold
        ${nudge && !open ? "animate-pulse ring-4 ring-accent/20" : ""}`}
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
        <span className="hidden sm:inline">Tanya AI</span>
      </button>

      {/* Panel chat */}
      {open && (
        <div
          role="dialog"
          aria-label="Tanya AI"
          className="fixed z-30 bottom-40 md:bottom-20 right-4 left-4 md:left-auto md:w-[420px] rounded-2xl border border-border bg-bg-card shadow-2xl flex flex-col max-h-[70vh]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Tanya AI — pasar & saham
            </p>
            <button onClick={() => setOpen(false)} aria-label="Tutup" className="p-1.5 -m-1 rounded-lg hover:bg-bg-tertiary">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {items.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Tanya apa saja soal pasar &amp; saham — jawaban dari data teknikal hari ini.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CHIPS.map((c) => (
                    <button
                      key={c}
                      onClick={() => ask(c)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {items.map((it, i) => (
              <div key={i} className={it.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    it.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent text-white px-3.5 py-2 text-sm"
                      : "max-w-[95%] rounded-2xl rounded-bl-sm bg-bg-tertiary px-3.5 py-2.5 text-sm text-text-primary leading-relaxed whitespace-pre-line"
                  }
                >
                  {it.text}
                  {it.links && it.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {it.links.map((l) => (
                        <Link
                          key={l.ticker}
                          href={`/stocks/${l.ticker}`}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-0.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
                        >
                          {l.ticker} <ArrowUpRight className="h-3 w-3" aria-hidden />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-bg-tertiary px-4 py-2.5 text-sm text-text-tertiary">
                  Membaca data pasar…
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex gap-2 p-3 border-t border-border">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(q); }}
              placeholder="Tanya apa saja… mis. BBCA kenapa turun?"
              maxLength={300}
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => ask(q)}
              disabled={loading || !q.trim()}
              aria-label="Kirim pertanyaan"
              className="px-3 py-2 rounded-xl bg-accent text-white disabled:opacity-50 h-11 w-11 inline-flex items-center justify-center"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="px-4 pb-2.5 text-[10px] text-text-tertiary">
            Jawaban dari data teknikal — edukasi, bukan rekomendasi beli/jual.
          </p>
        </div>
      )}
    </>
  );
}
