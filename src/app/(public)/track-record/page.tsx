import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import {
  computeWindowStats,
  getTrackRecordData,
  type SignalRow,
  type WindowStat,
  type TrackRecordData,
} from "@/lib/track-record.service";
import { dateLabel, formatPercent  } from "@/lib/utils";

// 516k rows di-aggregate — ISR 1 jam cukup (data harian, bukan intraday).
// Trust: ISR prerender saat build bisa membekukan fallback "diperbarui" kalau DB
// unreachable saat build (kejadian 17 Okt). Query cepat (±0,2s terukur) → dinamis.
export const dynamic = "force-dynamic";

// Trust asset, bukan target SEO: angka berubah tiap hari, tanpa keyword stabil (pola /pasar).
export const metadata: Metadata = {
  title: "Track Record Sinyal — Akurasi Diukur dari Database",
  description:
    "Skor akurasi sinyal golden cross & death cross TeknikalID, dihitung otomatis dari database harga sendiri. Tanpa survivorship bias.",
  alternates: { canonical: "/track-record" },
  robots: { index: false, follow: true },
};

const SIGNAL_LABEL: Record<string, string> = {
  golden_cross: "Golden Cross",
  death_cross: "Death Cross",
};

const pctFmt = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (v: number | null) => (v === null ? "n/a" : formatPercent(v));
const fmtRate = (v: number | null) => (v === null ? "n/a" : `${pctFmt.format(v)}%`);
const rateColor = (v: number | null) =>
  v === null ? "text-text-tertiary" : v >= 50 ? "text-bullish" : "text-bearish";

const monthLabel = (ym: string) => {
  if (ym === "all") return "Agregat";
  return new Date(`${ym}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

function aggregateFor(rows: SignalRow[], windowDays: 5 | 20, signal: string): WindowStat | null {
  return computeWindowStats(
    rows.filter((r) => r.signal === signal),
    windowDays,
    () => "all",
  )[0] ?? null;
}

function SummaryTable({ rows5, rows20 }: { rows5: SignalRow[]; rows20: SignalRow[] }) {
  const cells: Array<{ stat: WindowStat }> = [];
  for (const w of [5, 20] as const) {
    for (const s of ["golden_cross", "death_cross"]) {
      const stat = aggregateFor(w === 5 ? rows5 : rows20, w, s);
      if (stat) cells.push({ stat });
    }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-semibold">Sinyal</th>
            <th className="py-2 pr-4 font-semibold">Window</th>
            <th className="py-2 pr-4 font-semibold">Jumlah sinyal</th>
            <th className="py-2 pr-4 font-semibold">Terukur</th>
            <th className="py-2 pr-4 font-semibold">Belum terukur (n/a)</th>
            <th className="py-2 pr-4 font-semibold">Rata-rata</th>
            <th className="py-2 pr-4 font-semibold">Median</th>
            <th className="py-2 pr-4 font-semibold">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {cells.map(({ stat }) => (
            <tr key={`${stat.signal}-${stat.windowDays}`} className="border-b hover:bg-muted/50">
              <td className="py-2 pr-4 font-medium">{SIGNAL_LABEL[stat.signal] ?? stat.signal}</td>
              <td className="py-2 pr-4">{stat.windowDays} hari</td>
              <td className="py-2 pr-4 tabular-nums">{stat.nSignals}</td>
              <td className="py-2 pr-4 tabular-nums">{stat.nResolved}</td>
              <td className="py-2 pr-4 tabular-nums text-text-tertiary">{stat.nUnresolved}</td>
              <td className={`py-2 pr-4 tabular-nums ${stat.meanPct !== null && stat.meanPct < 0 ? "text-bearish" : stat.meanPct !== null ? "text-bullish" : "text-text-tertiary"}`}>
                {fmtPct(stat.meanPct)}
              </td>
              <td className={`py-2 pr-4 tabular-nums ${stat.medianPct !== null && stat.medianPct < 0 ? "text-bearish" : stat.medianPct !== null ? "text-bullish" : "text-text-tertiary"}`}>
                {fmtPct(stat.medianPct)}
              </td>
              <td className={`py-2 pr-4 tabular-nums font-semibold ${rateColor(stat.winRatePct)}`}>
                {fmtRate(stat.winRatePct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyTable({ stats5, stats20 }: { stats5: WindowStat[]; stats20: WindowStat[] }) {
  const rows = [...stats5, ...stats20].sort(
    (a, b) =>
      b.month.localeCompare(a.month) ||
      (a.signal === "golden_cross" ? -1 : 1) - (b.signal === "golden_cross" ? -1 : 1) ||
      a.windowDays - b.windowDays,
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-semibold">Bulan</th>
            <th className="py-2 pr-4 font-semibold">Sinyal</th>
            <th className="py-2 pr-4 font-semibold">Window</th>
            <th className="py-2 pr-4 font-semibold">n</th>
            <th className="py-2 pr-4 font-semibold">Rata-rata</th>
            <th className="py-2 pr-4 font-semibold">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.month}-${s.signal}-${s.windowDays}`} className="border-b hover:bg-muted/50">
              <td className="py-2 pr-4">{monthLabel(s.month)}</td>
              <td className="py-2 pr-4">{SIGNAL_LABEL[s.signal] ?? s.signal}</td>
              <td className="py-2 pr-4">{s.windowDays} hari</td>
              <td className="py-2 pr-4 tabular-nums">
                {s.nResolved}
                {s.nUnresolved > 0 && (
                  <span className="text-text-tertiary"> (+{s.nUnresolved} n/a)</span>
                )}
              </td>
              <td className={`py-2 pr-4 tabular-nums ${s.meanPct !== null && s.meanPct < 0 ? "text-bearish" : s.meanPct !== null ? "text-bullish" : "text-text-tertiary"}`}>
                {fmtPct(s.meanPct)}
              </td>
              <td className={`py-2 pr-4 tabular-nums font-semibold ${rateColor(s.winRatePct)}`}>
                {fmtRate(s.winRatePct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TrackRecordPage() {
  let data: TrackRecordData | null = null;
  try {
    data = await getTrackRecordData();
  } catch {
    data = null; // fail-safe: JANGAN throw — tampil pesan data diperbarui
  }

  const rows5 = data?.rows5 ?? [];
  const rows20 = data?.rows20 ?? [];
  const stats5 = data?.stats5 ?? [];
  const stats20 = data?.stats20 ?? [];
  const empty = !data || (stats5.length === 0 && stats20.length === 0);

  return (
    <>
      <PageHero
        eyebrow="Transparansi"
        title="Track Record Sinyal"
        description="Akurasi sinyal dihitung otomatis dari database harga TeknikalID sendiri — bukan klaim manual."
      >
        {!empty && data?.snapshotDate && (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Data s/d {dateLabel(data.snapshotDate)}
          </span>
        )}
      </PageHero>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {empty ? (
          <p className="rounded-lg border border-border bg-bg-card p-8 text-center text-text-tertiary">
            Data sedang diperbarui — muat ulang sebentar lagi.
          </p>
        ) : (
          <>
            <section>
              <h2 className="mb-1 text-lg font-semibold">Ringkasan 3 Bulan Terakhir</h2>
              <p className="mb-4 text-sm text-text-tertiary">
                Semua sinyal ikut dihitung; baris &quot;belum terukur&quot; = sinyal yang belum punya
                harga T+N, tidak dibuang dari populasi.
              </p>
              <SummaryTable rows5={rows5} rows20={rows20} />
            </section>

            <section className="mt-10">
              <h2 className="mb-1 text-lg font-semibold">Histori Bulanan</h2>
              <p className="mb-4 text-sm text-text-tertiary">Per bulan sinyal × jenis × window.</p>
              <MonthlyTable stats5={stats5} stats20={stats20} />
            </section>

            <section className="mt-10">
              <h2 className="mb-2 text-lg font-semibold">Cara Menghitung</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
                <li>
                  Sinyal diambil pada hari-T saat <code>smaCrossSignal</code> tercatat (golden cross
                  / death cross SMA50 vs SMA200).
                </li>
                <li>
                  Kinerja = (close T+N − close T) / close T, dengan N = 5 / 20 hari{" "}
                  <strong>bursa</strong> (offset baris harga per emiten, bukan hari kalender).
                </li>
                <li>
                  SEMUA sinyal ikut dihitung tanpa pengecualian atau penghapusan — tidak ada
                  survivorship bias.
                </li>
                <li>
                  Sinyal yang belum punya harga T+N ditandai &quot;belum terukur&quot;, tidak
                  dibuang dan tidak dimasukkan ke rata-rata.
                </li>
                <li>Hanya emiten EQUITY aktif.</li>
              </ul>
            </section>

            <p className="mt-8 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-tertiary">
              Disclaimer: Bukan rekomendasi jual beli. Kinerja masa lalu tidak menjamin hasil di
              masa depan.
            </p>
          </>
        )}
      </div>
    </>
  );
}
