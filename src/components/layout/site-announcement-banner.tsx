"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

/**
 * SiteAnnouncementBanner — banner P0 global (atas halaman) untuk
 * SITE_ANNOUNCEMENT dengan meta.banner=true yang belum dibaca.
 * Ref 19 Okt owner directive: bell = saluran info penting situs
 * (insiden down "minta maaf tadi down", maintenance, dsb).
 * Dismiss = hide lokal sesi (notif tetap ada di bell sampai dibaca).
 * REUSE: data dari /api/notifications existing via react-query key notif.
 */
export function SiteAnnouncementBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ["site-banner"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: !!session?.user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (!session?.user || !data?.data) return null;

  const banner = data.data.find(
    (n: { id: string; type: string; read: boolean; meta?: { banner?: boolean } | null }) =>
      n.type === "SITE_ANNOUNCEMENT" && !n.read && !!n.meta?.banner && !dismissed.includes(n.id)
  ) as
    | { id: string; meta: { title?: string; body?: string; severity?: string } | null }
    | undefined;

  if (!banner) return null;

  const sev = banner.meta?.severity;
  const styles =
    sev === "critical"
      ? "bg-bearish/10 border-bearish/40 text-bearish"
      : sev === "warning"
        ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
        : "bg-accent/10 border-accent/30 text-accent";

  return (
    <div className={`border-b px-4 py-2.5 text-sm ${styles}`} role="alert">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        <span aria-hidden="true">{sev === "critical" ? "🚨" : sev === "warning" ? "⚠️" : "📣"}</span>
        <p className="font-semibold">{banner.meta?.title}</p>
        <span className="text-text-secondary hidden sm:inline">— {banner.meta?.body}</span>
        <button
          onClick={() => setDismissed((d) => [...d, banner.id])}
          className="ml-auto text-xs opacity-70 hover:opacity-100"
          aria-label="Tutup pengumuman"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
