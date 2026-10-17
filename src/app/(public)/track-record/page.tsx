import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { MonthlyTable, SIGNAL_LABEL, SummaryTable, fmtPct, fmtRate } from "@/components/track-record/tables";
import { getTrackRecordData, type TrackRecordData } from "@/lib/track-record.service";
import { dateLabel } from "@/lib/utils";

// 516k rows di-aggregate (±0,2s terukur) — data harian, bukan intraday.
// Trust: prerender build-time tanpa DB membekukan empty state (RCA 18 Okt, 13 halaman
// kena) → wajib force-dynamic, pola /pasar.
export const dynamic = "force-dynamic";

// Trust asset, bukan target SEO: angka berubah tiap hari, tanpa keyword stabil (pola /pasar).
export const metadata: Metadata = {
  title: "Track Record Sinyal — Akurasi Diukur dari Database",
  description:
    "Skor akurasi sinyal golden cross & death cross TeknikalID, dihitung otomatis dari database harga sendiri. Tanpa survivorship bias.",
  alternates: { canonical: "/track-record" },
  robots: { index: false, follow: true },
};

export default async function TrackRecordPage() {
  let data: TrackRecordData | null = null;
  try {
    data = await getTrackRecordData();
  } catch {
    data = null; // fail-safe: JANGAN throw — tampil pesan data diperbarui
  }

  const empty = !data || (data.stats5.length === 0 && data.stats20.length === 0);
  const best = data?.best ?? null;

  return (
    <>
      <PageHero
        eyebrow="Transparansi"
        title="Track Record Sinyal"
        description="Akurasi sinyal dihitung otomatis dari database harga TeknikalID sendiri — bukan klaim manual."
      >
        {!empty && data?.snapshotDate && (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-3 py-1 text-xs font-medium text-text-secondary">
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
          data && <TrackRecordBody data={data} best={best} />
        )}
      </div>
    </>
  );
}

function TrackRecordBody({ data, best }: { data: TrackRecordData; best: TrackRecordData["best"] }) {
  return (
    <>
      {best && best.winRatePct !== null && (
        <p className="mb-6 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-secondary">
          Window terbaik (ranking otomatis, n≥20): {SIGNAL_LABEL[best.signal] ?? best.signal}{" "}
          {best.windowDays} hari — akurasi arah {fmtRate(best.winRatePct)}, rata-rata{" "}
          {fmtPct(best.meanPct)} dari {best.nResolved} sinyal terukur.
        </p>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold">Ringkasan 110 Hari Terakhir</h2>
        <p className="mb-4 text-sm text-text-tertiary">
          Semua sinyal ikut dihitung; &quot;belum terukur&quot; = sinyal yang belum punya harga
          T+N, tidak dibuang dari populasi.
        </p>
        <SummaryTable stats={[...data.stats5, ...data.stats20]} />
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Histori Bulanan</h2>
        <p className="mb-4 text-sm text-text-tertiary">
          Per bulan sinyal × jenis × window. Baris tanpa data close T+N tampil &quot;n/a&quot;.
        </p>
        <MonthlyTable stats5={data.monthly5} stats20={data.monthly20} />
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold">Cara Menghitung</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>
            Sinyal diambil pada hari-T saat cross SMA50/SMA200 tercatat (golden cross / death
            cross) — hanya hari event, bukan status harian.
          </li>
          <li>
            Kinerja = (close T+N − close T) / close T, dengan N = 5 / 20 hari{" "}
            <strong>bursa</strong> (offset baris harga per emiten, bukan hari kalender).
          </li>
          <li>
            Akurasi arah = persentase sinyal yang benar arahnya: golden cross benar bila harga
            naik, death cross benar bila harga turun.
          </li>
          <li>
            SEMUA sinyal ikut dihitung tanpa pengecualian atau penghapusan — tidak ada
            survivorship bias.
          </li>
          <li>
            Sinyal yang belum punya harga T+N ditandai &quot;belum terukur (n/a)&quot;, tidak
            dibuang dan tidak dimasukkan ke rata-rata.
          </li>
          <li>Hanya emiten EQUITY aktif; sumber: tabel harga &amp; indikator harian sendiri.</li>
        </ul>
      </section>

      <p className="mt-8 rounded-lg border border-border bg-bg-card p-4 text-sm text-text-tertiary">
        Disclaimer: Bukan rekomendasi jual beli. Kinerja masa lalu tidak menjamin hasil di masa
        depan.
      </p>
    </>
  );
}
