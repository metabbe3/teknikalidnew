import Link from "next/link";

/**
 * AgentKopiBanner (owner 6 Nov: "cross selling ... AI AGENT SAHARGA NGOPI",
 * upgrade 6 Nov sesuai rekomendasi Argon: kartu produk ringkas + harga coret).
 * Banner utk halaman high-traffic (home anon, /pasar, /swing, 14 halaman /saham-*).
 * Server component, zero JS, design token existing. Copy anti-slop.
 */
export function AgentKopiBanner({ source = "web" }: { source?: string }) {
  return (
    <aside className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-text-tertiary">BOT TELEGRAM · @TEKNIKALIDAGENTBOT</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            Malas cek grafik satu-satu? Tanya level support &amp; pasang alert harga langsung di Telegram.
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Ketik kode saham (misal: BBCA), bot langsung kirim ringkasan teknikal dan pantau target harga Anda.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <p className="text-xs text-text-secondary">
            Coba 3 chat gratis · Paket bulanan{" "}
            <span className="line-through text-text-tertiary">Rp29.000</span>{" "}
            <span className="font-semibold text-text-primary">Rp14.900</span>
          </p>
          <Link
            href={`/agent?from=kopi_${source}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Coba Bot Telegram
          </Link>
        </div>
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        Semua data dan angka di web ini tetap gratis — yang berbayar hanya asisten-nya.
      </p>
    </aside>
  );
}
