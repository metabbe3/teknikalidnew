/**
 * CompareTable — tabel head-to-head SSR-only /saham/[a]-vs-[b] (prd-2026-11-05-01).
 *
 * Server component (tanpa "use client"): data utuh di HTML — PRD AC1 curl tanpa
 * JS harus melihat kedua ticker + tabel; AC4 SSR-only (og:title/canonical di page).
 * 3 grup baris: Harga & Performa / Valuasi / Sinyal (PRD AC2). Format angka pakai
 * util satu pintu (formatPrice/formatPercent/formatMarketCap) — konsisten situs;
 * dividendYield DB sudah skala persen (probe 5 Nov: BBCA 6,7355 = 6,74%).
 */

import { Fragment } from "react";
import Link from "next/link";
import { Scale, Sparkles } from "lucide-react";
import { changeColor, formatMarketCap, formatPercent, formatPrice } from "@/lib/utils";
import { signalLabelId } from "@/lib/signal-label-id";
import { UhuAskCtaLink } from "@/components/uhu/uhu-provider";
import type { CompareData } from "@/domains/stock/compare.service";

function fmtPct(v: number | null): string {
  return v === null ? "—" : formatPercent(v);
}
function fmtNum(v: number | null, digits = 2): string {
  return v === null ? "—" : v.toFixed(digits).replace(".", ",");
}
function fmtYield(v: number | null): string {
  return v === null ? "—" : `${fmtNum(v, 2)}%`;
}
function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

const CONDITION_LABEL: Record<string, string> = {
  golden_cross: "Golden Cross",
  oversold: "Oversold",
  neutral: "Netral",
};

export function CompareTable({ data, slugA, slugB }: { data: CompareData; slugA: string; slugB: string }) {
  const { a, b } = data;
  const cleanA = a.ticker.replace(/\.JK$/, "");
  const cleanB = b.ticker.replace(/\.JK$/, "");

  type Row = { group: string; label: string; a: string; b: string; aCls?: string; bCls?: string };
  const rows: Row[] = [
    { group: "Harga & Performa", label: "Harga terakhir", a: a.perf.close !== null ? formatPrice(a.perf.close) : "—", b: b.perf.close !== null ? formatPrice(b.perf.close) : "—" },
    { group: "Harga & Performa", label: "Perubahan 1 sesi", a: fmtPct(a.perf.changePercent), b: fmtPct(b.perf.changePercent), aCls: changeColor(a.perf.changePercent), bCls: changeColor(b.perf.changePercent) },
    { group: "Harga & Performa", label: "Perubahan 1 minggu", a: fmtPct(a.perf.chg1w), b: fmtPct(b.perf.chg1w), aCls: changeColor(a.perf.chg1w), bCls: changeColor(b.perf.chg1w) },
    { group: "Harga & Performa", label: "Perubahan 1 bulan", a: fmtPct(a.perf.chg1m), b: fmtPct(b.perf.chg1m), aCls: changeColor(a.perf.chg1m), bCls: changeColor(b.perf.chg1m) },
    { group: "Valuasi", label: "P/E (TTM)", a: fmtNum(a.valuation.pe), b: fmtNum(b.valuation.pe) },
    { group: "Valuasi", label: "P/B", a: fmtNum(a.valuation.pb), b: fmtNum(b.valuation.pb) },
    { group: "Valuasi", label: "Dividen Yield", a: fmtYield(a.valuation.dividendYield), b: fmtYield(b.valuation.dividendYield) },
    { group: "Valuasi", label: "Kapitalisasi Pasar", a: a.valuation.marketCap !== null ? formatMarketCap(a.valuation.marketCap) : "—", b: b.valuation.marketCap !== null ? formatMarketCap(b.valuation.marketCap) : "—" },
    { group: "Sinyal", label: "Skor Sinyal (−1 s.d. +1)", a: fmtNum(a.signal.score), b: fmtNum(b.signal.score) },
    { group: "Sinyal", label: "Arah sinyal", a: a.signal.label ? signalLabelId(a.signal.label) : "—", b: b.signal.label ? signalLabelId(b.signal.label) : "—" },
    { group: "Sinyal", label: "Kondisi", a: CONDITION_LABEL[a.signal.condition], b: CONDITION_LABEL[b.signal.condition] },
    { group: "Sinyal", label: "RSI (14)", a: fmtNum(a.signal.rsi14), b: fmtNum(b.signal.rsi14) },
  ];

  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <div className="mt-5">
      <div className="indicator-card depth-shadow p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-text-primary">
            {cleanA} vs {cleanB} — Perbandingan Berdampingan
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={`Perbandingan saham ${cleanA} dan ${cleanB}`}>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2.5 pr-3 text-left text-xs font-semibold text-text-tertiary">Metrik</th>
                <th scope="col" className="py-2.5 px-3 text-left">
                  <span className="font-bold text-text-primary font-mono">{cleanA}</span>
                  <span className="block text-[10px] text-text-tertiary font-normal truncate max-w-[180px]">{a.name}</span>
                </th>
                <th scope="col" className="py-2.5 px-3 text-left">
                  <span className="font-bold text-text-primary font-mono">{cleanB}</span>
                  <span className="block text-[10px] text-text-tertiary font-normal truncate max-w-[180px]">{b.name}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g}>
                  <tr className="bg-bg-tertiary/40">
                    <td colSpan={3} className="py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      {g}
                    </td>
                  </tr>
                  {rows.filter((r) => r.group === g).map((r) => (
                    <tr key={`${g}-${r.label}`} className="border-b border-border/40 last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left text-xs font-medium text-text-secondary align-top">{r.label}</th>
                      <td className={`py-2.5 px-3 font-mono tabular-nums font-medium text-text-primary ${r.aCls ?? ""}`}>{r.a}</td>
                      <td className={`py-2.5 px-3 font-mono tabular-nums font-medium text-text-primary ${r.bCls ?? ""}`}>{r.b}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[10px] text-text-tertiary leading-relaxed">
          Data harga {cleanA} per {fmtDate(a.perf.asOf)} ({a.perf.sessions} sesi) · {cleanB} per {fmtDate(b.perf.asOf)} ({b.perf.sessions} sesi);
          valuasi {cleanA} per {fmtDate(a.valuation.asOf)} · {cleanB} per {fmtDate(b.valuation.asOf)}.
          Skor sinyal rentang −1 s.d. +1; kondisi (golden cross / oversold) mengikuti predikat screener TeknikalID.
          Analisis deskriptif — bukan rekomendasi beli/jual.
        </p>
      </div>

      {/* CTA funnel chat (PRD AC5b): logged-in buka Uhu, guest ke /agent */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <UhuAskCtaLink
          guestHref="/agent"
          pageContextOverride={a.ticker}
          className="flex items-center justify-center gap-1.5 min-h-11 flex-1 rounded-lg border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10 transition-colors"
        >
          <Sparkles className="h-4 w-4" aria-hidden /> Tanya AI: {cleanA} atau {cleanB}?
        </UhuAskCtaLink>
        <Link
          href={`/saham/${slugB}-vs-${slugA}`}
          className="flex items-center justify-center gap-1.5 min-h-11 flex-1 rounded-lg border border-border bg-bg hover:bg-bg-hover text-text-secondary text-sm font-medium transition-colors"
        >
          <Scale className="h-4 w-4" aria-hidden /> Balik urutan ({cleanB} dulu)
        </Link>
      </div>
    </div>
  );
}
