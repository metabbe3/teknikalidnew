import Link from "next/link";

/**
 * AgentKopiBanner (owner 6 Nov: "cross selling ... AI AGENT SAHAM SEHARGA NGOPI").
 * Banner dismiss-less 1 baris utk halaman high-traffic (home anon, /pasar, /swing,
 * 14 halaman /saham-*). Server component, zero JS, design token existing.
 * Copy anti-slop: harga jujur, tanpa buzzword, tanpa emoji dekoratif.
 */
export function AgentKopiBanner({ source = "web" }: { source?: string }) {
  return (
    <aside className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Sibuk kerja siang, males mantengin chart tiap malam?
          </p>
          <p className="text-sm text-text-secondary mt-0.5">
            Ada asisten saham AI di Telegram — jagain harga, kirim rekap sore 19.00 WIB,
            bisa ditanya kapan saja. Coba 3x tanya gratis. Cocok? Lanjut bulan pertama{" "}
            <span className="font-semibold text-text-primary">Rp14.900</span> — seharga
            segelas kopi, selanjutnya Rp29.000/bulan.
          </p>
        </div>
        <Link
          href={`https://t.me/TeknikalidAgentBot?start=kopi_${source}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors min-h-[44px]"
        >
          Coba Gratis di Telegram
        </Link>
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        Semua data dan angka di web ini tetap gratis — yang berbayar hanya asisten-nya.
      </p>
    </aside>
  );
}
