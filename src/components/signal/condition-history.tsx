import type { ConditionBacktestResult } from "@/lib/condition-backtest.service";

/**
 * 'Apa yang terjadi setelahnya?' — section riwayat & backtest kondisi
 * (PRD im-2026-10-29-1 / prd-2026-10-31-01; pilar GROWTH + TRUST).
 *
 * Native <details> SSR zero-JS (pola 'Rincian 9 indikator' #171) — statistik
 * historis jujur: median + % positif + pembanding IHSG (best-practice riset:
 * angka tanpa baseline = clickbait statistik). Tanpa chart lib (AC4).
 * Fail-diam: result null/empty -> empty-state eksplisit, bukan '0%' palsu.
 */

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  const s = v.toFixed(1).replace(".", ",");
  return (v > 0 ? "+" : "") + s + "%";
}

const HORIZON_LABEL: Record<number, string> = {
  5: "+5 hari perdagangan (±1 minggu)",
  20: "+20 hari perdagangan (±1 bulan)",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function ConditionHistory({ result }: { result: ConditionBacktestResult | null }) {
  if (!result || result.empty) {
    return (
      <details data-nav-label="condition_history_open" className="group mt-6 rounded-lg border border-border bg-bg-card p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
          Apa yang terjadi setelahnya? — riwayat kondisi ini
          <span className="ml-1.5 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">▾</span>
        </summary>
        <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
          Belum ada kejadian {result ? result.label.toLowerCase() : "kondisi ini"} tercatat dalam 24 bulan terakhir
          (data historis mulai Sep 2024). Statistik akan muncul otomatis begitu kondisi ini terjadi.
        </p>
      </details>
    );
  }

  return (
    <details data-nav-label="condition_history_open" className="group mt-6 rounded-lg border border-border bg-bg-card p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
        Apa yang terjadi setelahnya? — riwayat {result.nEvents} kejadian 24 bulan terakhir
        <span className="ml-1.5 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>

      <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
        Kondisi: <strong className="text-text-primary">{result.label}</strong> — tercatat{" "}
        <strong className="text-text-primary">{result.nEvents} kejadian</strong> di{" "}
        {result.nStocks} emiten aktif BEI dalam 24 bulan terakhir
        {result.firstEvent && result.lastEvent
          ? ` (${fmtDate(result.firstEvent)} – ${fmtDate(result.lastEvent)})`
          : ""}
        . Statistik di bawah dihitung dari data harga historis — <em>statistik historis, bukan rekomendasi</em>.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-text-tertiary">
              <th className="py-1.5 pr-4 font-medium">Jangka waktu</th>
              <th className="py-1.5 pr-4 font-medium">n</th>
              <th className="py-1.5 pr-4 font-medium">Median return</th>
              <th className="py-1.5 pr-4 font-medium">% positif</th>
              <th className="py-1.5 font-medium">Median vs IHSG</th>
            </tr>
          </thead>
          <tbody>
            {result.stats.map((st) => (
              <tr key={st.horizon} className="border-b border-border/50">
                <td className="py-1.5 pr-4 text-text-secondary">{HORIZON_LABEL[st.horizon] ?? `+${st.horizon} hari`}</td>
                <td className="py-1.5 pr-4 font-mono tabular-nums text-text-secondary">{st.n}</td>
                <td className="py-1.5 pr-4 font-mono tabular-nums font-semibold">
                  {st.n > 0 ? fmtPct(st.medianPct) : "—"}
                </td>
                <td className="py-1.5 pr-4 font-mono tabular-nums text-text-secondary">
                  {st.n > 0 && st.positivePct !== null ? st.positivePct.toFixed(1).replace(".", ",") + "%" : "—"}
                </td>
                <td className="py-1.5 font-mono tabular-nums text-text-secondary">
                  {st.nWithJkse > 0 ? fmtPct(st.medianRelPct) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.recentEvents.length > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-text-tertiary">
          Kejadian terakhir:{" "}
          {result.recentEvents.map((ev, i) => (
            <span key={ev.ticker + ev.date.toISOString()}>
              {i > 0 && " · "}
              <span className="font-mono">{ev.ticker.replace(".JK", "")}</span> ({fmtDate(ev.date)})
            </span>
          ))}
          . Metodologi: sinyal dihitung dari MA50/MA200 (SMA) harga penutupan; entry = close hari konfirmasi
          sinyal; kejadian muda (&lt;3 bulan) belum dihitung pada horizon panjang (anti look-ahead). Angka
          agregat direplikasi dari database — bukan rekomendasi beli/jual.
        </p>
      )}
    </details>
  );
}
