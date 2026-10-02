import { requireAdmin } from "@/lib/auth-guard";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getRetentionOverview, RETURNING_GUARD_PCT } from "@/lib/retention.service";
import { UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Retention — Admin" };

function Pct({ v }: { v: number | null }) {
  return <>{v === null ? "—" : `${v.toFixed(1)}%`}</>;
}

/** SVG sparkline poliline sederhana (tanpa lib) — 0 CLS, SSR. */
function Sparkline({ points }: { points: Array<{ weekStart: string; returningPct: number | null }> }) {
  const vals = points.map((p) => p.returningPct).filter((v): v is number => v !== null);
  if (vals.length < 2) return <div className="text-xs text-gray-400">Data belum cukup</div>;
  const w = 320, h = 48, pad = 4;
  const min = Math.min(...vals, RETURNING_GUARD_PCT);
  const max = Math.max(...vals, RETURNING_GUARD_PCT);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i * (w - 2 * pad)) / (points.length - 1);
    const y = p.returningPct === null ? null : h - pad - ((p.returningPct - min) / span) * (h - 2 * pad);
    return { x, y };
  });
  const path = coords.filter((c) => c.y !== null).map((c) => `${c.x.toFixed(1)},${c.y!.toFixed(1)}`).join(" ");
  const guardY = h - pad - ((RETURNING_GUARD_PCT - min) / span) * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" role="img" aria-label="Returning IP % 8 minggu">
      <line x1={pad} y1={guardY} x2={w - pad} y2={guardY} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1" />
      <polyline points={path} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
      {coords.filter((c) => c.y !== null).map((c, i) => <circle key={i} cx={c.x} cy={c.y!} r="2.5" fill="#2563eb" />)}
    </svg>
  );
}

export default async function AdminRetentionPage() {
  await requireAdmin();
  const o = await getRetentionOverview();
  const badgeGreen = o.guardOk;

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Retention"
        description="Satu sumber kebenaran retensi — returning IP % mingguan (Senin–Minggu WIB) vs guard, cohort register D1/D7, dead-letter notifikasi."
        icon={UserCheck}
      />

      {/* Card returning % + guard badge + sparkline 8 minggu */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Returning IP % — minggu ini</div>
            <div className="text-3xl font-extrabold text-gray-900">
              <Pct v={o.returningPct} />
            </div>
            <div className="text-xs text-gray-500">
              {o.returningIps}/{o.totalIps} IP nobot · pekan {o.weekStart} s/d {o.weekEnd} (WIB)
            </div>
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${badgeGreen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            title={`Guard ${RETURNING_GUARD_PCT}%`}
          >
            {badgeGreen ? "OK" : "BELOW GUARD"} · guard {o.guardPct}%
            {o.guardDeltaPp !== null && !badgeGreen ? ` (−${Math.abs(o.guardDeltaPp).toFixed(1)} pp)` : ""}
            {o.guardDeltaPp !== null && badgeGreen ? ` (+${o.guardDeltaPp.toFixed(1)} pp)` : ""}
          </span>
        </div>
        <div className="mt-4">
          <Sparkline points={o.sparkline} />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>{o.sparkline[0]?.weekStart ?? ""}</span>
            <span>guard {RETURNING_GUARD_PCT}% (garis kuning)</span>
            <span>{o.sparkline[o.sparkline.length - 1]?.weekStart ?? ""}</span>
          </div>
        </div>
      </div>

      {/* Tabel cohort 4 minggu */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Cohort minggu</th>
              <th className="px-4 py-3 text-right">Register</th>
              <th className="px-4 py-3 text-right">D1</th>
              <th className="px-4 py-3 text-right">D1 %</th>
              <th className="px-4 py-3 text-right">D7</th>
              <th className="px-4 py-3 text-right">D7 %</th>
            </tr>
          </thead>
          <tbody>
            {o.cohorts.map((c) => (
              <tr key={c.weekStart} className="border-b border-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{c.weekStart}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{c.nRegister}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{c.d1N}</td>
                <td className="px-4 py-2.5 text-right text-gray-700"><Pct v={c.d1Pct} /></td>
                <td className="px-4 py-2.5 text-right text-gray-700">{c.d7N}</td>
                <td className="px-4 py-2.5 text-right">
                  <Pct v={c.d7Pct} />
                  {!c.d7Mature && <span className="ml-1 text-[10px] text-gray-400">(berjalan)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[11px] text-gray-400">
          D1/D7 = % register yang kembali buka halaman (PageView ter-identitas) pada window rolling hari+1 / hari+7 pasca-register.
        </p>
      </div>

      {/* Dead-letter notifikasi */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-bold text-gray-800">Notifikasi in-product dead-letter</div>
        <div className="mt-1 text-xs text-gray-500">
          RE_ENGAGE / SCREENER_MATCH yang dibuat saat penerima sudah &gt;30 hari tanpa aktivitas — loop ini TIDAK andal untuk user churned.
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <div>
            <div className="text-2xl font-extrabold text-gray-900"><Pct v={o.deadLetter.deadLetterPct} /></div>
            <div className="text-xs text-gray-500">dead-letter ({o.deadLetter.deadLetterNotif}/{o.deadLetter.totalNotif})</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900">{o.deadLetter.readNotif}</div>
            <div className="text-xs text-gray-500">dibaca (dari {o.deadLetter.totalNotif})</div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-gray-400">
        Dibaca {new Date(o.generatedAt).toISOString()} · cache 5 menit · definisi kanonik: minggu Senin–Minggu WIB, IP nobot dengan ≥2 hari kunjungan berbeda.
      </div>
    </div>
  );
}
