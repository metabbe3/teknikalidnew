"use client";

import { useState } from "react";

export function WaitlistForm({ waLink }: { waLink: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "loading" | "ok" | "dup" | "err"; position?: number; msg?: string }>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", value: email }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState({ kind: "ok", position: data.position });
      } else if (res.status === 409) {
        setState({ kind: "dup", position: data.position });
      } else if (res.status === 400 && data.reason === "email") {
        setState({ kind: "err", msg: "Format email belum benar." });
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
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@kamu.com"
          className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="px-5 py-2.5 rounded-lg bg-text-primary text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 press-scale"
        >
          {state.kind === "loading" ? "Menyimpan…" : "Daftar via Email"}
        </button>
      </form>
      {state.kind === "err" && <p className="text-xs text-bearish">{state.msg}</p>}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center px-5 py-2.5 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 text-[#229ED9] text-sm font-semibold hover:bg-[#229ED9]/20 transition press-scale"
      >
        Daftar via WhatsApp (1 klik)
      </a>
    </div>
  );
}
