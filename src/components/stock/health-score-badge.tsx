"use client";

import { signalToHealthScore, healthScoreMeta } from "@/lib/utils";

interface HealthScoreBadgeProps {
  signalScore: number | null;
  size?: "sm" | "lg";
}

// qw-audit-tk-1 (30 Okt): skor tampil RAW 2-desimal (-1..+1, identik /pasar radar
// & tabel). Konversi 0-100 tetap JUJUR sebagai detail implementasi gauge/label —
// bukan angka yang ditampilkan; menghapus dual-format 0-100 vs 0-1 antar halaman.
export function HealthScoreBadge({ signalScore, size = "sm" }: HealthScoreBadgeProps) {
  const band = signalToHealthScore(signalScore); // 0-100 internal: warna + label band saja
  if (band === null || signalScore === null) return null;

  const meta = healthScoreMeta(band);
  const skor = signalScore.toFixed(2); // format identik dgn /pasar (raw, 2 desimal)

  if (size === "lg") {
    // Large version for detail page hero — compact horizontal gauge
    return (
      <div className="inline-flex flex-col w-[76px] shrink-0">
        {/* Score number */}
        <div className="flex items-baseline">
          <span className="text-xl font-extrabold tabular-nums leading-none" style={{ color: meta.color }}>
            {skor}
        </span>
        </div>
        {/* Gauge bar */}
        <div className="mt-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${band}%`,
              backgroundColor: meta.color,
            }}
          />
        </div>
        {/* Label */}
        <span
          className="text-[9px] font-bold mt-1 leading-tight"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
    );
  }

  // Small version for stock cards — compact pill
  return (
    <span
      className="inline-flex items-center justify-center h-6 min-w-[44px] px-1.5 rounded-full text-xs font-bold tabular-nums"
      style={{ color: meta.color, backgroundColor: meta.bg }}
      title={`Skor sinyal ${skor} (${meta.label}) — rangkuman indikator teknikal, bukan rekomendasi`}
    >
      {skor}
    </span>
  );
}
