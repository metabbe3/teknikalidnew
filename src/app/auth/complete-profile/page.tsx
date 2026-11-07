"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck } from "lucide-react";
import { PromoBanner } from "@/components/auth/promo-banner";
import { USERNAME_REGEX } from "@/lib/constants";
import { trackCtaEvent } from "@/components/engagement-instrument";

export default function CompleteProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const emailLocal = (session?.user?.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  const suggested = /^[a-zA-Z0-9_]{3,20}$/.test(emailLocal) ? emailLocal : "";
  const [username, setUsername] = useState(suggested);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [name, setName] = useState(session?.user?.name || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ux-2026-11-07-01: satu gate format = regex server (authService) — tombol
  // tidak aktif sebelum format valid, tidak ada round-trip error sia-sia.
  const usernameValid = USERNAME_REGEX.test(username);

  // ux-2026-11-07-01: cek ketersediaan debounced (reuse endpoint existing
  // /api/profile/check-username — pola sama profile/edit). Race-guard seq.
  const checkSeq = useRef(0);
  useEffect(() => {
    setUsernameTaken(false);
    if (!usernameValid) return;
    const seq = ++checkSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check-username?username=${encodeURIComponent(username)}`);
        if (!res.ok || seq !== checkSeq.current) return;
        const data = await res.json();
        setUsernameTaken(data.available === false);
      } catch { /* best-effort, non-critical */ }
    }, 400);
    return () => clearTimeout(t);
  }, [username, usernameValid]);

  // Session client-side terisi SETELAH mount — useState(suggested) latch kosong.
  // Sync sekali saat session ready, selama user belum menulis apa pun.
  useEffect(() => {
    if (usernameTouched) return;
    if (suggested && username !== suggested) setUsername(suggested);
  }, [suggested, username, usernameTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!usernameValid) {
      setError("Username harus 3-20 karakter (huruf, angka, underscore)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat profil");
        setLoading(false);
        return;
      }

      // ux-2026-11-07-01: fire-on-SUCCESS (pola register_success) — bukan klik
      trackCtaEvent("complete_profile_success");

      await update();

      // Register hook: fulfill guest save-intent (pending_post_register), then return to where they came from
      let next = "/";
      try {
        const raw = sessionStorage.getItem("pending_post_register");
        if (raw && raw.length <= 8192) {
          const pending = JSON.parse(raw);
          if (pending?.type === "save_screen" && pending.filters && typeof pending.filters === "object") {
            await fetch("/api/screener/saved", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "Screen pertama saya", filters: pending.filters }),
            }).catch(() => {});
          } else if (pending?.type === "watchlist" && typeof pending.ticker === "string" && pending.ticker) {
            await fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticker: pending.ticker }),
            }).catch(() => {});
          } else if (pending?.type === "portfolio_cta" && typeof pending.ticker === "string" && pending.ticker) {
            // ux-2026-10-30-01: guest klik "Catat di portofolio" di halaman saham →
            // pasca-register kembali ke halaman saham (form prefill, bukan auto-add:
            // harga/lot tetap input user).
            window.location.href = `/stocks/${encodeURIComponent(pending.ticker)}?ctx=portfolio_cta`;
            sessionStorage.removeItem("pending_post_register");
            return;
          }
          // same-origin relative only — reject '//evil.com' and absolute/scheme URLs
          if (typeof pending?.next === "string" && pending.next.startsWith("/") && !pending.next.startsWith("//")) {
            next = pending.next;
          }
          sessionStorage.removeItem("pending_post_register");
        }
        // tracking-audit G8: migrasikan SELURUH pantauan guest (localStorage guest_watchlist)
        // ke akun baru — dulu hanya 1 ticker pending yang ikut, sisanya hilang tepat saat
        // user berkomitmen paling dalam.
        try {
          const gw = localStorage.getItem("guest_watchlist");
          if (gw) {
            const tickers: string[] = JSON.parse(gw);
            for (const t of tickers.slice(0, 25)) {
              await fetch("/api/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker: t }),
              }).catch(() => {});
            }
          }
        } catch { /* silent */ }
      } catch {
        sessionStorage.removeItem("pending_post_register");
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-bg-card depth-shadow rounded-xl p-6 space-y-6">
        <div className="text-center">
          {/* ux-2026-11-07-01: afirmasi akun — user barusan lulus langkah terberat */}
          <CircleCheck className="h-10 w-10 text-bullish mx-auto" aria-hidden />
          <h1 className="text-xl font-bold mt-3">Akun berhasil dibuat</h1>
          <p className="text-text-secondary text-sm mt-1">Tinggal pilih username untuk mulai analisa</p>
        </div>

        <PromoBanner />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1.5">Username</label>
            <div className="relative">
              <input
                id="username"
                type="text"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setUsername(e.target.value.toLowerCase());
                }}
                required
                maxLength={20}
                autoComplete="username"
                aria-invalid={usernameTouched && !usernameValid}
                aria-describedby="username-hint"
                className={`w-full bg-bg-hover border rounded-xl px-3 py-2 text-sm font-mono pr-8 focus:outline-none focus:ring-1 focus:ring-accent ${
                  usernameTaken ? "border-bearish" : "border-border"
                }`}
                placeholder="trader_jakarta"
              />
              {usernameValid && !usernameTaken && username.length > 0 && (
                <Check className="h-4 w-4 text-bullish absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden />
              )}
            </div>
            {usernameTaken ? (
              <p id="username-hint" className="text-xs text-bearish mt-1">Username sudah dipakai — coba yang lain</p>
            ) : (
              <p id="username-hint" className="text-[10px] text-text-secondary mt-1">3-20 karakter, huruf, angka, underscore</p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">Nama (opsional)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full bg-bg-hover border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Nama tampilan"
            />
          </div>

          {error && <p role="alert" className="text-sm text-bearish">{error}</p>}

          <button
            type="submit"
            disabled={loading || !usernameValid || usernameTaken}
            data-engagement="complete_profile_submit"
            className="w-full bg-text-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity press-scale disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Menyimpan..." : "Mulai Pakai TeknikalID"}
          </button>
        </form>
      </div>
    </div>
  );
}
