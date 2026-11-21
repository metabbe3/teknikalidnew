import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-guard";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  getActivationFunnelData,
  calcConversionRate,
} from "@/domains/analytics/activation-funnel.service";
import {
  Target,
  MessageSquare,
  HelpCircle,
  ShieldAlert,
  UserPlus,
  Sparkles,
  MousePointerClick,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnel Aktivasi — Admin",
  description: "Dashboard funnel aktivasi AI & konversi registrasi pengguna",
};

function formatPct(val: number | null): string {
  if (val === null) return "—";
  return `${val.toFixed(1)}%`;
}

function formatDateLabel(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export default async function AdminActivationPage() {
  await requireAdmin();

  const data = await getActivationFunnelData(7);
  const { days, totals } = data;

  const totalOpenToQuestion = calcConversionRate(
    totals.guest_first_question,
    totals.guest_chat_open,
  );
  const totalQuestionToRegister = calcConversionRate(
    totals.register_click_from_chat,
    totals.guest_first_question,
  );

  return (
    <div className="space-y-6 fade-in p-6">
      <AdminPageHeader
        title="Funnel Aktivasi"
        description="Analitik funnel aktivasi pengunjung, interaksi guest AI chat, dan konversi pendaftaran (7 hari terakhir, WIB)."
        icon={Target}
      />

      {/* KPI Cards Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Chat Dibuka */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Chat Dibuka
            </span>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {totals.guest_chat_open.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 text-xs text-gray-400">guest_chat_open (7h)</div>
        </div>

        {/* Card 2: Tanya Pertama */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tanya Pertama
            </span>
            <HelpCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {totals.guest_first_question.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-emerald-700">
            <span>Buka → Tanya:</span>
            <span className="font-bold">{formatPct(totalOpenToQuestion)}</span>
          </div>
        </div>

        {/* Card 3: Mentok Kuota */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Mentok Kuota
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {totals.guest_quota_wall.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 text-xs text-gray-400">guest_quota_wall (7h)</div>
        </div>

        {/* Card 4: Klik Register */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Daftar via Chat
            </span>
            <UserPlus className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {totals.register_click_from_chat.toLocaleString("id-ID")}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-indigo-700">
            <span>Tanya → Daftar:</span>
            <span className="font-bold">
              {formatPct(totalQuestionToRegister)}
            </span>
          </div>
        </div>

        {/* Card 5: Entry Point CTA */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Entry CTA
            </span>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {(totals.hero_ai_cta + totals.analysis_block_cta).toLocaleString(
              "id-ID",
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex justify-between">
            <span>Hero: {totals.hero_ai_cta}</span>
            <span>Block: {totals.analysis_block_cta}</span>
          </div>
        </div>
      </div>

      {/* Tabel 7 Hari x 6 Event + Konversi */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Rincian Funnel Harian (7 Hari Terakhir)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Data dikelompokkan per tanggal kalender WIB (00:00–23:59).
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span>UI Publik Only</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-right" title="Klik tombol AI di Hero Homepage">
                  Hero AI CTA
                </th>
                <th className="px-4 py-3 text-right" title="Klik CTA di blok Analisis Saham">
                  Block CTA
                </th>
                <th className="px-4 py-3 text-right" title="Pengunjung tamu membuka drawer/panel chat">
                  Buka Chat
                </th>
                <th className="px-4 py-3 text-right" title="Pengunjung tamu mengirim pertanyaan pertama">
                  Tanya Pertama
                </th>
                <th className="px-4 py-3 text-right" title="Pengunjung tamu mencapai limit kuota 3 pertanyaan">
                  Mentok Kuota
                </th>
                <th className="px-4 py-3 text-right" title="Pengunjung tamu mengklik CTA register di dalam chat">
                  Klik Daftar
                </th>
                <th className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/30" title="Rasio Tanya Pertama / Buka Chat">
                  Buka → Tanya %
                </th>
                <th className="px-4 py-3 text-right text-indigo-700 bg-indigo-50/30" title="Rasio Klik Daftar / Tanya Pertama">
                  Tanya → Daftar %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((row) => {
                const openToQ = calcConversionRate(
                  row.guest_first_question,
                  row.guest_chat_open,
                );
                const qToReg = calcConversionRate(
                  row.register_click_from_chat,
                  row.guest_first_question,
                );

                return (
                  <tr key={row.date} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      <span>{row.date}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        ({formatDateLabel(row.date)})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {row.hero_ai_cta.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {row.analysis_block_cta.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">
                      {row.guest_chat_open.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">
                      {row.guest_first_question.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {row.guest_quota_wall.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold tabular-nums">
                      {row.register_click_from_chat.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700 bg-emerald-50/20 tabular-nums">
                      {formatPct(openToQ)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-indigo-700 bg-indigo-50/20 tabular-nums">
                      {formatPct(qToReg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-slate-50 font-bold text-gray-900">
                <td className="px-4 py-3 text-left">Total (7 Hari)</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {totals.hero_ai_cta.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {totals.analysis_block_cta.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {totals.guest_chat_open.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {totals.guest_first_question.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {totals.guest_quota_wall.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-indigo-900">
                  {totals.register_click_from_chat.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right text-emerald-800 bg-emerald-100/50 tabular-nums">
                  {formatPct(totalOpenToQuestion)}
                </td>
                <td className="px-4 py-3 text-right text-indigo-800 bg-indigo-100/50 tabular-nums">
                  {formatPct(totalQuestionToRegister)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Catatan Glosarium */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2 text-xs text-gray-600">
        <div className="font-bold text-gray-800 text-sm">Glosarium Metrik Funnel</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-gray-700">Hero AI CTA / Block CTA:</strong> Titik masuk
            pengunjung dari tombol "Tanya AI Saham" di hero atau tombol "Tanya AI tentang emiten ini" di analisis saham.
          </li>
          <li>
            <strong className="text-gray-700">Buka Chat:</strong> Event saat pengunjung tamu pertama kali membuka widget Uhu chat.
          </li>
          <li>
            <strong className="text-gray-700">Tanya Pertama:</strong> Event saat tamu mengirim pesan pertanyaan pertama ke AI.
          </li>
          <li>
            <strong className="text-gray-700">Mentok Kuota:</strong> Event saat tamu mencapai batas 3 pertanyaan gratis dan melihat quota wall.
          </li>
          <li>
            <strong className="text-gray-700">Daftar via Chat:</strong> Event saat tamu mengklik tombol registrasi di dalam widget chat setelah bertanya / terhalang limit.
          </li>
          <li>
            <strong className="text-gray-700">Buka → Tanya %:</strong> Efektivitas UI chat mengonversi pembuka pasif menjadi penanya aktif (<code className="bg-gray-100 px-1 py-0.5 rounded">Tanya Pertama ÷ Buka Chat</code>).
          </li>
          <li>
            <strong className="text-gray-700">Tanya → Daftar %:</strong> Daya dorong fitur AI mengonversi user yang sudah bertanya menjadi pendaftar akun (<code className="bg-gray-100 px-1 py-0.5 rounded">Klik Daftar ÷ Tanya Pertama</code>).
          </li>
        </ul>
      </div>
    </div>
  );
}
