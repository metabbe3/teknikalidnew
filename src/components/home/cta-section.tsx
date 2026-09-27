"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function CtaSection() {
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  // Anon variant is the safe default while session status resolves (no hydration flash)
  const headline = isAuthed
    ? "Lanjutkan analisa Anda"
    : "Simpan analisa Anda, jangan mulai dari nol besok";
  const sub = isAuthed
    ? "Watchlist, paper trading, dan portfolio tracker sudah aktif di akun Anda."
    : "Watchlist pribadi, alert sinyal golden cross & oversold, dan trading plan otomatis untuk 950+ saham IDX. Daftar gratis, 30 detik selesai.";
  const primaryHref = isAuthed ? "/watchlist" : "/auth/register";
  const primaryLabel = isAuthed ? "Buka Watchlist" : "Daftar Gratis";
  const secondaryHref = isAuthed ? "/paper-trading" : "/stocks";
  const secondaryLabel = isAuthed ? "Coba Paper Trading" : "Jelajahi Saham Dulu";

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f172a] p-8 sm:p-10">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-lg space-y-4">
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {headline}
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">{sub}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={primaryHref}
            className="bg-white text-text-primary hover:bg-white/90 px-5 py-2.5 min-h-11 sm:min-h-0 rounded-lg font-medium text-sm transition-colors press-scale"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="border border-white/20 text-white px-5 py-2.5 min-h-11 sm:min-h-0 rounded-lg font-medium text-sm hover:bg-white/10 transition-all press-scale"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
