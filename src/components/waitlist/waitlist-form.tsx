"use client";

import { useState } from "react";

type Channel = "email" | "wa";

/** AC2: ambil utm_source dari URL params (client-side, saat submit — tanpa
 *  useSearchParams agar bebas Suspense-boundary). Server tetap whitelist-sanitize. */
function getUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("utm_source");
}

export function WaitlistForm({ waLink }: { waLink: string }) {
  const [channel, setChannel] = useState<Channel>("email");
  const [value, setValue] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "loading" | "ok" | "dup" | "err"; position?: number; msg?: string }>({ kind: "idle" });

  function switchChannel(next: Channel) {
    setChannel(next);
    setValue("");
    setState({ kind: "idle" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, value, source: getUtmSource() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState({ kind: "ok", position: data.position });
      } else if (res.status === 409) {
        setState({ kind: "dup", position: data.position });
      } else if (res.status === 400 && (data.reason === "email" || data.reason === "wa")) {
        setState({
          kind: "err",
          msg: channel === "email" ? "Format email belum benar." : "Format nomor WA belum benar (contoh: 0812xxxxxxx).",
        });
      } else {
        setState({ kind: "err", msg: "Gagal menyimpan — coba lagi sebentar." });
      }
    } catch {
      setState({ kind: "err", msg: "Koneksi bermasalah — coba lagi." });
    }
  }

  if (state.kind === "ok" || state.kind === "dup") {
    return (
      <div className="rounded-lg bg-bullish-bg/40 border border-bullish/30 px-4 py-3 text-sm">
        {state.kind === "ok" ? (
          <p className="text-bullish font-semibold">
            ✅ Terdaftar! Posisi antrean #{state.position}
          </p>
        ) : (
          <p className="text-text-secondary">
            Kamu sudah terdaftar (posisi #{state.position}) — tidak perlu daftar dua kali 👍
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AC1: inline email ATAU nomor WA — dua jalur setara, mobile-first. */}
      <div className="flex rounded-lg border border-border overflow-hidden text-sm" role="tablist" aria-label="Pilih cara daftar">
        <button
          type="button"
          role="tab"
          aria-selected={channel === "email"}
          onClick={() => switchChannel("email")}
          className={`flex-1 px-3 py-2 font-semibold transition ${channel === "email" ? "bg-text-primary text-white" : "text-text-secondary hover:bg-bg-secondary"}`}
        >
          📧 Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={channel === "wa"}
          onClick={() => switchChannel("wa")}
          className={`flex-1 px-3 py-2 font-semibold transition ${channel === "wa" ? "bg-text-primary text-white" : "text-text-secondary hover:bg-bg-secondary"}`}
        >
          💬 Nomor WA
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        {channel === "email" ? (
          <input
            type="email"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="email@kamu.com"
            autoComplete="email"
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        ) : (
          <input
            type="tel"
            required
            inputMode="tel"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="08xx-xxxx-xxxx"
            autoComplete="tel"
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        )}
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="px-5 py-2.5 rounded-lg bg-text-primary text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 press-scale"
        >
          {state.kind === "loading" ? "Menyimpan…" : channel === "email" ? "Daftar via Email" : "Daftar via WA"}
        </button>
      </form>
      {state.kind === "err" && <p className="text-xs text-bearish">{state.msg}</p>}

      {/* AC4: WA deep-link tetap opsional sebagai jalur sekunder. */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center px-5 py-2.5 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 text-[#229ED9] text-sm font-semibold hover:bg-[#229ED9]/20 transition press-scale"
      >
        Atau chat langsung via WhatsApp (1 klik)
      </a>
    </div>
  );
}
