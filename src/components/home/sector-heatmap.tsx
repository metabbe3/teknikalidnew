import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatPercentPlain } from "@/lib/utils";
import { getSectorSlug, sectorToBahasa } from "@/lib/sectors";

interface SectorData {
  avgChange: number;
  count: number;
}

/**
 * Peta Sektor — desain tenang satu baris-per-sektor (owner 24 Okt: heatmap lama
 * 13 kotak terlalu rame). Baris = nama + jumlah saham + bar mini + % rata-rata.
 * Klik → halaman sektor. SSR murni, animasi hover halus, no JS interaktif.
 */
export function SectorHeatmap({ sectors }: { sectors: Record<string, SectorData> }) {
  const entries = Object.entries(sectors)
    .filter(([sector]) => !sector.toUpperCase().includes("UNCATEGORIZED"))
    .sort((a, b) => b[1].avgChange - a[1].avgChange);

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Peta Sektor"
        action={
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">
            {entries.length} sektor · rata-rata % hari ini
          </span>
        }
      />
      <div className="rounded-xl border border-border bg-bg-card/40 overflow-hidden divide-y divide-border/60">
        {entries.map(([sector, { count, avgChange }], i) => {
          const isPositive = avgChange >= 0;
          const magnitude = Math.min(Math.abs(avgChange) / 3, 1);
          const barW = 12 + magnitude * 78; // 12–90% lebar
          const slug = getSectorSlug(sector);
          const label = sectorToBahasa(sector);
          const body = (
            <>
              <span className="w-[44%] sm:w-[38%] text-xs font-semibold text-text-primary truncate">
                {label}
              </span>
              <span className="hidden sm:block flex-1 h-1 rounded-full bg-border/60 overflow-hidden" aria-hidden="true">
                <span
                  className={`block h-full rounded-full ${isPositive ? "bg-bullish" : "bg-bearish"}`}
                  style={{ width: `${barW}%`, marginLeft: isPositive ? "auto" : undefined, transform: "translateX(-100%)" }}
                />
              </span>
              <span className="text-[10px] text-text-tertiary tabular-nums w-14 text-right hidden xs:block sm:block">
                {count} saham
              </span>
              <span
                className={`text-sm font-bold font-mono tabular-nums w-16 text-right ${
                  isPositive ? "text-bullish" : "text-bearish"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatPercentPlain(avgChange)}%
              </span>
            </>
          );
          return slug ? (
            <Link
              key={sector}
              href={`/sektor/${slug}`}
              style={{ "--stagger-i": i } as React.CSSProperties}
              className="sector-row flex items-center gap-3 px-4 py-2.5 hover:bg-bg-card transition-colors group"
            >
              {body}
            </Link>
          ) : (
            <div
              key={sector}
              style={{ "--stagger-i": i } as React.CSSProperties}
              className="sector-row flex items-center gap-3 px-4 py-2.5"
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
