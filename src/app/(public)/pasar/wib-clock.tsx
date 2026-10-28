"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Jam WIB client-side (tuning ISR /pasar 28 Okt): dengan revalidate 60s, jam
 * yang dirender server bisa telat ≤60s di halaman "live". Jam sekarang berdetak
 * di browser (tiap 30s) — SSR me-render placeholder "--:--" agar tidak ada
 * hydration mismatch, lalu terisi instan setelah mount.
 */
export function WibClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      });
    setTime(fmt());
    const t = setInterval(() => setTime(fmt()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 text-text-tertiary text-sm font-mono">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {time ?? "--:--"} WIB
    </span>
  );
}
