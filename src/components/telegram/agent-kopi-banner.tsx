import Link from "next/link";
import { PricingBox } from "@/components/telegram/pricing-box";

/**
 * AgentKopiBanner (owner 6 Nov: "cross selling ... AI AGENT SAHARGA NGOPI",
 * upgrade 10 Nov: unifikasi PricingBox + fallback CTA tetap).
 * Banner utk halaman high-traffic (home anon, /pasar, /swing, 14 halaman /saham-*).
 */
export function AgentKopiBanner({ source = "web" }: { source?: string }) {
  return (
    <aside className="space-y-4 rounded-xl border border-border bg-bg-card p-4 sm:p-5" data-source={source}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-mono text-xs text-text-tertiary">BOT TELEGRAM · @TEKNIKALIDAGENTBOT</p>
          <p className="text-sm font-semibold text-text-primary">
            Malas cek grafik satu-satu? Tanya level support &amp; pasang alert harga langsung di Telegram.
          </p>
          <p className="text-xs font-semibold text-text-primary">
            Gratis 3x/hari · Night Trader Rp29rb/bln · Pro Rp79rb/bln
          </p>
          <div className="space-y-0.5 text-xs text-text-secondary">
            <p>
              <span className="font-medium text-text-primary">Night Trader:</span> alert harga &amp; sinyal sore
            </p>
            <p>
              <span className="font-medium text-text-primary">Pro:</span> semua fitur + backtest &amp; evaluasi
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/agent"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Lihat Agent
          </Link>
        </div>
      </div>
      <PricingBox />
      <p className="text-xs text-text-tertiary">
        Semua data dan angka di web ini tetap gratis, yang berbayar hanya asisten di Telegram.
      </p>
    </aside>
  );
}
