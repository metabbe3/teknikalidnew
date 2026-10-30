"use client";

/**
 * AskAiFab (owner 30 Okt): floating action button "tanya apapun" — 1 tempat di SEMUA halaman.
 * - Owner 30 Okt (revisi): anon LIHAT FAB (teaser) tapi diarahkan login dulu —
 *   panel guest menampilkan contoh chips + CTA Masuk/Daftar; baru chat setelah login.
 * - Mobile: FAB bulat kanan-bawah 56px (≥44px tap target); Desktop: pill kanan-bawah.
 * - Buka modal chat ringan → POST /api/ai/screener (mode MARKET, glm-flash + PasarSnapshot).
 * - Deteksi ticker 4-huruf di pertanyaan → auto redirect deep-link ke halaman saham
 *   (jawaban per-ticker terlengkap ada di /stocks/TICKER dgn chips kontekstual).
 * - Token warna teknikal.id semua; ikon lucide; state loading/empty/error lengkap.
 * - Z-index 50 (owner 30 Okt: harus PALING ATAS — dulu z-30 kalah sama sticky nav z-40
 *   "Chart/Indikator/Analisa/Asing/Trading Plan" & toast onboarding z-40 yang menutup FAB).
 *   bottom-24 mobile clearance di atas TickerFab bottom bar.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sparkles, X, Send, ArrowUpRight } from "lucide-react";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { detectTickerInText, isPlausibleTicker } from "@/lib/ai-ticker-guard";
import { splitFollowUps } from "@/lib/ai-followups";

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
  followUps?: string[];
}

/** Pisahkan baris [FOLLOWUPS] X | Y | Z dari teks jawaban → chips tappable (riset Argon P0-4). */
// RT-05: parser tangguh dipindah ke lib/ai-followups (multiline, **bold**, separator |/;/atau)

export function AskAiFab() {
  const { status } = useSession();
  // RT-03 red-team 30 Okt: FAB sadar halaman + ingat saham lintas turn.
  // pageTicker: user buka /stocks/BBCA.JK → pertanyaan "kenapa turun?" otomatis konteks BBCA.
  // activeTicker: ticker terakhir dari obrolan → turn-2 "supportnya berapa?" tetap nyambung.
  const pathname = usePathname();
  const pageTicker = useMemo(() => {
    const m = pathname?.match(/\/stocks\/([A-Z]{4})(?:\.JK)?/i);
    return m ? m[1].toUpperCase() : null;
  }, [pathname]);
  const activeTickerRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  // animasi thinking (owner 30 Okt "mungkin animasi ketika thinking"): fase bergilir
  const [thinkPhase, setThinkPhase] = useState(0);
  useEffect(() => {
    if (!loading) { setThinkPhase(0); return; }
    const iv = setInterval(() => setThinkPhase((p) => (p + 1) % 4), 1400);
    return () => clearInterval(iv);
  }, [loading]);
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

  const isAuthed = status === "authenticated";
  const isGuest = status === "unauthenticated"; // loading → tampil FAB, klik no-op sampai status jelas

  async function ask(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setItems((p) => [...p, { role: "user", text }]);
    setQ("");
    setLoading(true);
    setError(null);
    try {
      // ROUTING (owner 30 Okt: "responsenya sama terus"): sebut ticker 4-huruf → endpoint SAHAM
      // (context per-saham + COMPARE + posisiUser floating P/L); tanpa ticker → endpoint PASAR.
      // Dulu semua ke /api/ai/screener → jawaban pasar identik utk pertanyaan per-saham.
      const tickerHit = detectTickerInText(text); // guard: "yang/data/macd" ≠ ticker (owner 30 Okt bug YANG)
      // makro eksplisit = ganti topik, reset konteks saham
      const macroSwitch = /\b(ihsg|pasar hari ini|saham apa|screener|sektor apa|top ?gainer|top ?loser|index)\b/i.test(text);
      const effTicker = tickerHit ?? (macroSwitch ? null : (activeTickerRef.current ?? pageTicker));
      if (tickerHit) activeTickerRef.current = tickerHit;
      else if (macroSwitch) activeTickerRef.current = null;
      // history utk multi-turn (max 6, dipadatkan): AI paham "kalau BBRI gimana?" tanpa konteks ulang
      const history = items
        .slice(-6)
        .map((it) => ({ role: it.role === "user" ? "user" : "ai", text: it.text.slice(0, 400) }));
      const res = await fetch(effTicker ? "/api/ai/stock" : "/api/ai/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          effTicker
            ? { mode: "ask", ticker: `${effTicker}.JK`, question: text, history }
            : { question: text, history },
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Gagal menjawab");
      // G2 hand-off: pertanyaan pasar ternyata per-saham → re-POST ke jalur saham dgn context server
      if (data.handoff === "stock" && data.ticker && data.context) {
        const r2 = await fetch("/api/ai/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "ask", ticker: `${data.ticker}.JK`, question: text, history }),
        });
        const d2 = await r2.json();
        if (r2.ok && d2.ok) Object.assign(data, { text: d2.text });
      }
      // ekstrak ticker dari jawaban utk tombol deep-link
      const links = [...new Set((data.text as string).match(ID_TICKER_RE) ?? [])]
        .filter((t) => t !== "IHSG" && isPlausibleTicker(t))
        .slice(0, 4)
        .map((ticker) => ({ ticker }));
      const split = splitFollowUps(String(data.text ?? ""));
      setItems((p) => [...p, { role: "ai", text: split.text, links, followUps: split.followUps }]);
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
        data-authed={isAuthed ? "1" : "0"}
        aria-label={open ? "Tutup tanya AI" : "Tanya AI apa saja"}
        data-engagement="fab_ask_ai"
        className={`fixed z-50 bottom-24 md:bottom-6 right-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent text-white shadow-lg hover:bg-accent/90 active:scale-95 transition
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
          className="fixed z-50 bottom-40 md:bottom-20 right-4 left-4 md:left-auto md:w-[420px] rounded-2xl border border-border bg-bg-card shadow-2xl flex flex-col max-h-[70vh]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Tanya AI — pasar & saham
            </p>
            <button onClick={() => setOpen(false)} aria-label="Tutup" className="p-1.5 -m-1 rounded-lg hover:bg-bg-tertiary">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {isGuest ? (
            /* Gate login (owner 30 Okt): teaser terlihat, aksi diarahkan masuk dulu */
            <div className="flex-1 px-4 py-4 space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Tanya apa saja soal pasar &amp; saham — jawaban dari data teknikal hari ini,
                langsung dari halaman mana pun.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((c) => (
                  <span key={c} className="text-xs px-3 py-1.5 rounded-full border border-border text-text-tertiary">
                    {c}
                  </span>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-bg-primary p-3.5 space-y-3">
                <p className="text-sm font-semibold text-text-primary">Gratis untuk member ✨</p>
                <p className="text-xs text-text-tertiary">
                  Masuk untuk mulai bertanya — daftar 30 detik, tanpa kartu kredit.
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center text-sm font-bold text-white bg-accent hover:bg-accent/90 rounded-lg px-4 py-2.5"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center text-sm font-semibold text-accent border border-accent/40 hover:bg-accent/10 rounded-lg px-4 py-2.5"
                  >
                    Daftar Gratis
                  </Link>
                </div>
              </div>
            </div>
          ) : (
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
                      : "max-w-[95%] rounded-2xl rounded-bl-sm bg-bg-tertiary px-3.5 py-2.5 text-sm text-text-primary leading-relaxed"
                  }
                >
                  {it.role === "user" ? it.text : <AiMarkdown text={it.text} compact /> }
                  {it.role === "ai" && it.followUps && it.followUps.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {it.followUps.map((f) => (
                        <button
                          key={f}
                          onClick={() => ask(f)}
                          className="text-left text-xs px-3 py-1.5 rounded-full border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
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
                <div className="rounded-2xl rounded-bl-sm bg-bg-tertiary px-4 py-2.5 text-sm text-text-tertiary flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" aria-hidden />
                  <span className="animate-pulse">
                    {["Membaca data pasar…", "Cek pergerakan asing…", "Hitung indikator teknikal…", "Nyusun jawaban…"][thinkPhase]}
                  </span>
                  <span className="flex gap-1" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          )}

          {!isGuest && (
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
          )}
          <p className="px-4 pb-2.5 text-[10px] text-text-tertiary">
            Jawaban dari data teknikal — edukasi, bukan rekomendasi beli/jual.
          </p>
        </div>
      )}
    </>
  );
}
