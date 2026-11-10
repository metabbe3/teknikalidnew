"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

/**
 * TelegramSubscribeCta (retention-2026-10-28) — CTA subscribe bot TIDAK annoying:
 * - dismissible via localStorage 7 hari (inline variant)
 * - copy halus, bahasa awam, tap target ≥44px, bukan-rekomendasi vibes
 * - SATU PINTU deep-link t.me/TeknikalidAgentBot?start=KODE_JK (identik stock page)
 * - footer variant: 1 baris kecil, tanpa dismiss (statis, di server component juga bisa
 *   jika tanpa ticker — tapi dipakai di client parent)
 */
const LS_KEY = "tgcta_dismissed_until";

export function TelegramSubscribeCta({
  variant = "inline",
  ticker,
  botUrl,
  startParam,
}: {
  variant?: "inline" | "footer";
  ticker?: string;
  botUrl?: string;
  startParam?: string;
}) {
  const [userDismissed, setUserDismissed] = useState(false);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isStoredDismissed = useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        const until = Number(localStorage.getItem(LS_KEY) || 0);
        return until > Date.now();
      } catch {
        return false;
      }
    },
    () => false,
  );

  const dismiss = () => {
    setUserDismissed(true);
    try {
      localStorage.setItem(LS_KEY, String(Date.now() + 7 * 86400_000));
    } catch {
      /* ignore */
    }
  };

  const base = botUrl ?? "https://t.me/TeknikalidAgentBot";
  const start = startParam
    ? `?start=${encodeURIComponent(startParam)}`
    : ticker
    ? `?start=web_${encodeURIComponent(ticker.replace(/\.JK$/, ""))}`
    : `?start=web_berita`;
  const href = `${base}${start}`;

  if (variant === "footer") {
    return (
      <p className="border-t border-border pt-3 text-xs text-text-tertiary">
        Mau update tiap hari tanpa buka browser?{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent hover:underline"
        >
          Pantau lewat Telegram (gratis, tanpa login)
        </a>
        .
      </p>
    );
  }

  if (!isMounted || isStoredDismissed || userDismissed) return null;

  return (
    <aside
      className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/5 to-transparent p-4"
      aria-label="Langganan pantauan Telegram"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">
            Suka lihat radar &amp; sinyal tiap hari?
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Pilih saham favoritmu — ringkasan harga, sinyal, dan riset baru
            dikirim ke Telegram kamu setiap sore. Gratis, tanpa login, berhenti
            kapan saja.
          </p>
        </div>
        <button
          type="button"
          aria-label="Tutup ajakan ini"
          className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-bg-primary hover:text-text-secondary"
          onClick={dismiss}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-engagement="tg_subscribe_click"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        Pantau via Telegram
      </a>
    </aside>
  );
}

export type AgentMembership = {
  email?: string;
  chatBound: boolean;
  chatId: string | null;
  tier: string;
  status: string | null;
  periodEnd: string | null;
  turnsUsed: number;
  maxTurns: number;
  promoUsed: boolean;
  trialUsed?: boolean;
  trialCreatedAt?: string | null;
  trialDaysLeft?: number;
};

const AGENT_BOT_URL = "https://t.me/TeknikalidAgentBot";

export type AgentMembershipCtx = {
  mem: AgentMembership | null;
  loading: boolean;
  bindUrl: string | null;
  payingTier: "basic" | "pro" | null;
  paying: boolean;
  msg: string | null;
  connected: boolean;
  hasProvider: boolean;
  startBind: () => Promise<void>;
  checkout: (tier: "basic" | "pro") => Promise<void>;
};

const AgentCtx = createContext<AgentMembershipCtx | null>(null);

const FALLBACK_AGENT_CTX: AgentMembershipCtx = {
  mem: null,
  loading: false,
  bindUrl: null,
  payingTier: null,
  paying: false,
  msg: null,
  connected: false,
  hasProvider: false,
  startBind: async () => {
    if (typeof window !== "undefined") {
      window.location.href = "/agent";
    }
  },
  checkout: async () => {
    if (typeof window !== "undefined") {
      window.location.href = "/agent#paket";
    }
  },
};

export function useAgentCtx(): AgentMembershipCtx {
  const ctx = useContext(AgentCtx);
  return ctx ?? FALLBACK_AGENT_CTX;
}

export function AgentMembershipProvider({ children }: { children: React.ReactNode }) {
  const [mem, setMem] = useState<AgentMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [bindUrl, setBindUrl] = useState<string | null>(null);
  const [payingTier, setPayingTier] = useState<"basic" | "pro" | null>(null);
  const paying = payingTier !== null;
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/membership");
      if (r.ok) setMem(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startBind = async () => {
    setMsg(null);
    const r = await fetch("/api/agent/bind", { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      setBindUrl(j.bindUrl);
    } else if (r.status === 401) {
      window.location.href = "/auth/register?next=/agent&cta=bind";
      return;
    } else {
      setMsg("Gagal membuat token — coba login ulang.");
    }
  };

  const checkout = async (tier: "basic" | "pro") => {
    setPayingTier(tier);
    setMsg(null);
    try {
      const r = await fetch("/api/agent/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, promo: !mem?.promoUsed }),
      });
      if (r.status === 401) {
        window.location.href = "/auth/register?next=/agent&cta=pay";
        return;
      }
      const j = await r.json();
      if (r.status === 409 && j.error === "BINDING_REQUIRED") {
        setMsg("Hubungkan Telegram dulu (langkah 2 di atas) — 10 detik, tanpa isi apa-apa.");
        return;
      }
      if (j.redirect_url) {
        window.location.href = j.redirect_url as string;
        return;
      }
      setMsg(j.message ?? "Checkout gagal — coba beberapa saat lagi.");
    } finally {
      setPayingTier(null);
    }
  };

  const connected = !loading && Boolean(mem?.chatBound);

  return (
    <AgentCtx.Provider
      value={{
        mem,
        loading,
        bindUrl,
        payingTier,
        paying,
        msg,
        connected,
        hasProvider: true,
        startBind,
        checkout,
      }}
    >
      {children}
    </AgentCtx.Provider>
  );
}

export function AgentHeroCta() {
  const { connected, bindUrl, startBind } = useAgentCtx();
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {connected ? (
        <Button onClick={startBind} className="gap-2" size="lg">
          {bindUrl ? "Buka Telegram & Mulai" : "Hubungkan Telegram — 1 Klik"}
        </Button>
      ) : bindUrl ? (
        <a href={bindUrl} target="_blank" rel="noopener noreferrer">
          <Button className="gap-2" size="lg">Buka Telegram &amp; Mulai</Button>
        </a>
      ) : (
        <Button onClick={startBind} className="gap-2" size="lg">
          Hubungkan Telegram — 1 Klik
        </Button>
      )}
      <a href="#paket">
        <Button variant="outline" size="lg">Lihat Paket Mulai Rp14.900</Button>
      </a>
    </div>
  );
}

export function AgentConnectionCard() {
  const { loading, mem, bindUrl, startBind } = useAgentCtx();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {loading
            ? "Memuat status akun…"
            : mem?.chatBound
              ? "Akun Telegram Anda sudah terhubung"
              : bindUrl
                ? "Langkah 2: Buka Telegram & Mulai"
                : "Langkah 1: Masuk atau Daftar Akun Terlebih Dahulu"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-text-secondary">Memuat…</p>
        ) : mem?.chatBound ? (
          <div className="space-y-2">
            <p className="text-sm text-text-primary font-medium">
              Terhubung (chat {mem.chatId}). Kuota tanya bisa dicek langsung dari bot.
            </p>
            <a href={`${AGENT_BOT_URL}?start=web_agentpage`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">Buka Bot di Telegram</Button>
            </a>
          </div>
        ) : bindUrl ? (
          <div className="space-y-2">
            <p className="text-sm">
              Satu klik: buka Telegram, tekan <b>Start</b> — akun langsung terikat dan
              onboarding bot langsung jalan.
            </p>
            <a href={bindUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">Buka Telegram &amp; Mulai</Button>
            </a>
            <p className="text-xs text-text-tertiary">
              Link berlaku 15 menit. Akun email kamu yang mengikat langganan Telegram-mu.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              Daftar gratis dengan email — setelah itu kembali ke halaman ini dan
              hubungkan Telegram dalam 1 klik.
            </p>
            <Button onClick={startBind} className="gap-2">
              Daftar Akun Gratis / Hubungkan Telegram — 1 Klik
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { PricingBox as AgentPricingCards } from "@/components/telegram/pricing-box";

export function AgentComplainBox() {
  const { mem } = useAgentCtx();
  const defaultEmail = mem?.email ?? "";
  const [email, setEmail] = useState(defaultEmail);
  const [emailTouched, setEmailTouched] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const displayEmail = emailTouched ? email : email || defaultEmail;

  const submit = async () => {
    if (text.trim().length < 5) return;
    setBusy(true);
    try {
      const trimmedEmail = displayEmail.trim();
      const r = await fetch("/api/agent/complain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
        }),
      });
      if (r.ok) {
        setSent(true);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  };
  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
        ✅ Keluhanmu tercatat. Kami balas via email/chat Telegram terikat maks 24 jam.
        <button className="ml-2 underline hover:text-accent" onClick={() => setSent(false)}>
          kirim lagi
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <p className="text-sm font-medium text-text-primary">Ada masalah? Sampaikan di sini</p>
      <p className="mt-1 text-xs text-text-tertiary">
        Masalah pembayaran, jawaban bot, apa pun — langsung ke tim, tanpa bingung harus ke mana.
        (Di bot Telegram juga bisa: ketik <code>/keluhan</code>)
      </p>
      <input
        type="email"
        value={displayEmail}
        onChange={(e) => {
          setEmailTouched(true);
          setEmail(e.target.value);
        }}
        maxLength={160}
        placeholder="Email untuk balasan (opsional)…"
        className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Tulis keluhanmu…"
        className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={submit} disabled={busy || text.trim().length < 5}>
          {busy ? "Mengirim…" : "Kirim keluhan"}
        </Button>
      </div>
    </div>
  );
}

export function AgentClosingCta() {
  const { connected, bindUrl, mem, paying, startBind, checkout } = useAgentCtx();
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {connected || bindUrl ? (
        <a href={bindUrl ?? `${AGENT_BOT_URL}?start=web_agentpage`} target="_blank" rel="noopener noreferrer">
          <Button className="gap-2" size="lg">Hubungkan Telegram (1 Klik)</Button>
        </a>
      ) : (
        <Button onClick={startBind} className="gap-2" size="lg">
          Daftar &amp; Coba 3 Chat Gratis
        </Button>
      )}
      {mem?.status !== "paid" && (
        <Button onClick={() => checkout("basic")} variant="outline" size="lg" disabled={paying || !mem?.chatBound}>
          Ambil Night Trader Rp14.900
        </Button>
      )}
    </div>
  );
}
