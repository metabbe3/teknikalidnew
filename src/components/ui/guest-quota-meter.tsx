"use client";

/**
 * GuestQuota — meter kuning/merah page saham utk anon (Retention Loop v2).
 * Counter localStorage per-kalender-hari (reset tengah malam, ikut TZ lokal device —
 * anon gak punya session server). SSR-safe: render null sampai mounted.
 * Logged-in user tidak pernah melihat ini.
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const QUOTA_KEY = "teknikal:guest_quota";
// product-audit-2026-10-29 QW5: sinkron dengan guest-pass.ts GUEST_DAILY_FREE 5 → 25
const DAILY_FREE = 25;

interface QuotaState {
  date: string; // YYYY-MM-DD lokal
  count: number;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function readGuestQuota(): QuotaState {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QuotaState;
      if (parsed && typeof parsed.count === "number") {
        if (parsed.date === today()) return parsed;
        return { date: today(), count: 0 }; // hari baru = reset
      }
    }
  } catch {
    // private mode / corrupt — anggap fresh
  }
  return { date: today(), count: 0 };
}

export function bumpGuestQuota(): QuotaState {
  const s = readGuestQuota();
  s.count += 1;
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
  return s;
}

export function GuestQuotaMeter({ stockViews }: { stockViews: number }) {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || status === "authenticated" || status === "loading") return null;

  const left = Math.max(0, DAILY_FREE - stockViews);
  const pct = Math.min(100, (stockViews / DAILY_FREE) * 100);
  const warn = left <= 1;

  if (left >= DAILY_FREE) return null; // belum ada aktivitas — jangan noise

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
        warn
          ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
          : "border-border bg-bg-card text-text-secondary"
      }`}
      role="status"
    >
      <span aria-hidden>{warn ? "⚠️" : "👁️"}</span>
      <span className="tabular-nums font-medium">
        {left > 0 ? `${left} saham gratis lagi hari ini` : "Kuota gratis hari ini habis"}
      </span>
      <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-border" aria-hidden>
        <span
          className={`block h-full rounded-full ${warn ? "bg-amber-500" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
