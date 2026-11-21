import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Mover } from "@/domains/stock/market-snapshot.service";

/**
 * KenapaMoversModule — section SSR "Kenapa Bergerak Hari Ini" di /stocks (PRD prd-2026-11-20-02).
 * Menjembatani link-equity dari magnet #2 (/stocks 105 PV/7d) ke 129+ halaman kenapa-* yang yatim.
 * Server component — 0 client-JS baru (AC3: LCP mobile tidak boleh regresi).
 *
 * Data: EOD SATU PINTU marketSnapshotService.getSnapshot() (ref-2026-10-17-01) —
 * DILARANG SQL/jalur movers terpisah; caller melewatkan snap.gainers/snap.losers yang
 * SUDAH dimuat page (0 query tambahan).
 *
 * Fallback jujur (AC1/AC2, pattern DailyRadar): pool kosong → pesan jujur + tanggal
 * as-of sesi EOD, DILARANG fabricate jumlah.
 *
 * Selectivitas (AC2): halaman kenapa = template dinamis 200 utk semua ticker EQUITY
 * aktif; arah link mengikuti sign(changePercent) movers sesi terakhir sehingga link
 * tidak pernah 404 maupun mismatch arah (RenderMovementPage redirect-kanonik ke arah benar).
 */
export function KenapaMoversModule({
  gainers,
  losers,
  sessionDate,
}: {
  gainers: Mover[];
  losers: Mover[];
  sessionDate: string | null;
}) {
  const dateStr = sessionDate
    ? format(new Date(`${sessionDate}T00:00:00+07:00`), "d MMM yyyy", { locale: idLocale })
    : null;

  const groups: Array<{
    key: string;
    title: string;
    items: Mover[];
    direction: "naik" | "turun";
  }> = [
    { key: "naik", title: "Top Penguat", items: gainers, direction: "naik" },
    { key: "turun", title: "Top Pelemah", items: losers, direction: "turun" },
  ];

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-bold text-text-primary">
          Kenapa Bergerak Hari Ini
        </h2>
        {dateStr && (
          <span className="font-mono text-[10px] text-text-tertiary">
            data sesi {dateStr}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs sm:text-sm text-text-secondary leading-relaxed">
        Analisis kenapa saham paling bergerak hari ini — lengkap dengan sinyal teknikal RSI, MACD, dan posisi harga terhadap rata-rata.
      </p>

      {gainers.length === 0 && losers.length === 0 ? (
        /* AC2: pool kosong (hari non-trading) → pesan jujur, bukan angka palsu */
        <p className="mt-4 rounded-lg bg-bg-secondary/40 px-4 py-3 text-xs sm:text-sm text-text-secondary">
          Belum ada data pergerakan sesi terakhir{dateStr ? ` (sesi ${dateStr})` : ""}. Daftar akan muncul setelah sesi perdagangan terbaru selesai.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.key}>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {g.direction === "naik" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-bullish" aria-hidden />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-bearish" aria-hidden />
                )}
                {g.title}
              </h3>
              <ul className="mt-2 divide-y divide-border/60">
                {g.items.length === 0 ? (
                  <li className="px-1 py-2.5 text-xs text-text-tertiary">
                    Tidak ada {g.direction === "naik" ? "penguat" : "pelemah"} likuid pada sesi terakhir.
                  </li>
                ) : (
                  g.items.map((m) => {
                    const clean = m.ticker.replace(/\.JK$/, "");
                    const href = `/saham/${clean.toLowerCase()}/kenapa-${g.direction}-hari-ini`;
                    return (
                      <li key={m.ticker}>
                        <Link
                          href={href}
                          className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-accent/[0.04] transition-colors"
                        >
                          <div className="min-w-0">
                            {/* AC4: anchor deskriptif (SEO-06), bukan bare ticker */}
                            <span className="text-xs sm:text-sm font-semibold text-accent">
                              Kenapa saham {clean} {g.direction} hari ini
                            </span>
                            <p className="text-[11px] text-text-secondary truncate max-w-[240px]">
                              {m.name}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 font-mono text-xs font-medium tabular-nums ${
                              g.direction === "naik" ? "text-bullish" : "text-bearish"
                            }`}
                          >
                            {m.changePercent >= 0 ? "+" : ""}
                            {m.changePercent.toFixed(2)}%
                          </span>
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
