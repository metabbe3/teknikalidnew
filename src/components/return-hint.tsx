import Link from "next/link";

/**
 * ReturnHint — prd-2026-11-21-01 (P1 STICKY) AC2: jalur follow-up eksplisit
 * utk landing panas one-visit (/, /stocks, /paper-trading).
 *
 * WHY: 149 anonId baru 7d, 98,7% tak pernah balik (day-2 return 1,3%). Seri
 * konten harian (brief/updates) + deep-link next-day adalah "alasan balik"
 * termurah — SSR murni, 0 client-JS, 0 migrasi DB (freeze-safe).
 *
 * CTA Telegram pakai href start=kopi_returnhint → bridge anonPrefix __a_
 * (engagement-instrument G3) menangkap klik sebagai tg_pantau_klik.
 */
interface ReturnHintProps {
  /** Konteks halaman — menyesuaikan copy "lanjut besok". */
  variant: "home" | "stocks" | "paper";
}

const VARIANTS: Record<ReturnHintProps["variant"], { title: string; body: string; next: { href: string; label: string } }> = {
  home: {
    title: "Besok mampir lagi — brief pagi selalu segar",
    body: "Kalau hari ini cuma sempat sekilas: brief pasar pagi dan update penutapan IHSG terbit tiap hari. Tautan ini membuka ringkasan terbaru.",
    next: { href: "/berita/brief-pasar", label: "Baca brief pasar terbaru" },
  },
  stocks: {
    title: "Screener-nya besok cerita lain",
    body: "Sinyal golden cross, oversold, dan volume spike dihitung ulang tiap penutapan pasar. Simpan halaman ini — besok daftarnya berubah.",
    next: { href: "/screener", label: "Buka screener sinyal hari ini" },
  },
  paper: {
    title: "Portofolio latihan menunggu besok",
    body: "Harga bergerak tiap sesi — posisi paper-trading kamu ikut ter-update. Kembali besok untuk review, atau minta AI agent mengingatkan lewat Telegram.",
    next: { href: "https://t.me/TeknikalidAgentBot?start=kopi_returnhint", label: "AI agent ingatkan via Telegram" },
  },
};

export function ReturnHint({ variant }: ReturnHintProps) {
  const v = VARIANTS[variant];
  const isExternal = v.next.href.startsWith("http");
  return (
    <aside
      data-engagement="return_hint_view"
      className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-bg-card/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Alasan kembali besok"
    >
      <div className="max-w-2xl space-y-1">
        <p className="text-sm font-semibold text-text-primary">{v.title}</p>
        <p className="text-xs leading-relaxed text-text-secondary">{v.body}</p>
      </div>
      {isExternal ? (
        <a
          href={v.next.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/[0.06] px-4 py-2 text-sm font-medium text-[#229ED9] transition-colors hover:bg-[#229ED9]/[0.12]"
        >
          {v.next.label}
        </a>
      ) : (
        <Link
          href={v.next.href}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-bg-hover px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-card"
        >
          {v.next.label}
        </Link>
      )}
    </aside>
  );
}
