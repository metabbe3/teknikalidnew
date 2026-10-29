"use client";

/**
 * GuestOverlimitBanner — muncul saat kuota anon habis, menawarkan register
 * dengan konteks page yang ingin dibuka (intent tinggi).
 * TIDAK memblokir konten (SEO & UX aman) — banner persuasif di atas konten,
 * pola "nudge" bukan paywall keras.
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { readGuestQuota } from "./guest-quota-meter";

export function GuestOverlimitBanner({ ticker }: { ticker?: string }) {
  const { status } = useSession();
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const q = readGuestQuota();
      setOver(q.count > 5);
    }
  }, [status]);

  if (status !== "unauthenticated" || !over) return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 depth-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Anda sudah menjelajah cukup jauh hari ini
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {ticker
              ? `Daftar gratis untuk terus membuka ${ticker} — plus watchlist, alert harga, dan paper trading.`
              : "Daftar gratis untuk akses penuh — watchlist, alert harga, dan paper trading."}
          </p>
        </div>
        <Link
          href="/auth/register"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90 transition-colors press-scale"
        >
          Daftar Gratis
        </Link>
      </div>
    </div>
  );
}
