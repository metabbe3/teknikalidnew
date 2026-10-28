"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { MousePointerClick, Timer, ScrollText, Filter, Globe2, UserCheck } from "lucide-react";

interface EngagementData {
  generatedAt: string;
  totals: { events24h: number; events7d: number };
  byType24h: Record<string, number>;
  groups7d: Array<{
    group: string;
    dwellCount: number;
    dwellAvgSec: number | null;
    dwellMedianSec: number | null;
    scrollCount: number;
    scrollAvgPct: number | null;
  }>;
  funnel7d: { viewed: number; dwell60Plus: number; ctaAfterDwell: number; returnedLaterDay: number };
  clicksByLabel7d: Array<{ type: string; label: string; count: number; unique: number }>;
}

interface GeoData {
  days: number;
  total: number;
  breakdown: Array<{ country: string; views: number; pct: number }>;
}

const GROUP_LABEL: Record<string, string> = {
  "/stocks": "Halaman saham",
  "/berita": "Berita & brief",
  "/akademi": "Akademi",
  other: "Halaman lain",
};

function fmtSec(v: number | null) {
  if (v == null) return "-";
  return v >= 60 ? `${Math.floor(v / 60)}m ${Math.round(v % 60)}s` : `${Math.round(v)}s`;
}

/**
 * Tab Insight — satu rumah telemetri engagement (dwell/scroll/funnel/CTA) + geo.
 * Konsumsi API existing /api/admin/engagement + /api/admin/views-geo (audit bo-2026-10-28-02:
 * data sehat tapi yatim UI). Pilar STICKY + GROWTH (North Star).
 */
export function InsightTab() {
  const eng = useQuery<EngagementData>({
    queryKey: ["admin-engagement"],
    queryFn: async () => {
      const r = await fetch("/api/admin/engagement");
      if (!r.ok) throw new Error("gagal memuat engagement");
      return r.json();
    },
    refetchInterval: 60_000,
  });
  const geo = useQuery<GeoData>({
    queryKey: ["admin-views-geo"],
    queryFn: async () => {
      const r = await fetch("/api/admin/views-geo?days=7");
      if (!r.ok) throw new Error("gagal memuat geo");
      return r.json();
    },
    refetchInterval: 300_000,
  });

  const e = eng.data;
  const f = e?.funnel7d;
  const stages = [
    { label: "Pengunjung (anonId)", value: f?.viewed ?? 0, color: "bg-blue-500" },
    { label: "Baca ≥60 detik", value: f?.dwell60Plus ?? 0, color: "bg-indigo-500" },
    { label: "Klik CTA setelahnya", value: f?.ctaAfterDwell ?? 0, color: "bg-purple-500" },
    { label: "Kembali di hari lain", value: f?.returnedLaterDay ?? 0, color: "bg-emerald-500" },
  ];
  const maxStage = Math.max(1, ...stages.map((s) => s.value));
  const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(0)}%` : "-");

  const kpis = [
    { title: "Event 7 hari", icon: Timer, value: (e?.totals.events7d ?? 0).toLocaleString("id-ID"), subtitle: `${(e?.totals.events24h ?? 0).toLocaleString("id-ID")} / 24 jam`, gradient: "blue" as const },
    { title: "Klik CTA 7 hari", icon: MousePointerClick, value: e?.clicksByLabel7d.filter((c) => c.type === "cta_click").reduce((s, c) => s + c.count, 0) ?? 0, subtitle: "Tombol/tautan yang diklik", gradient: "emerald" as const },
    { title: "Kembali di hari lain", icon: UserCheck, value: f?.returnedLaterDay ?? 0, subtitle: `${pct(f?.returnedLaterDay ?? 0, f?.viewed ?? 1)} dari pengunjung`, gradient: "rose" as const },
    { title: "View 7 hari (manusia)", icon: Globe2, value: (geo.data?.total ?? 0).toLocaleString("id-ID"), subtitle: "Setelah filter bot", gradient: "amber" as const },
  ];

  const clickColumns = [
    {
      header: "Label",
      cell: (r: { type: string; label: string }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-gray-900">{r.label}</span>
          {r.type === "nav_click" ? (
            <Badge variant="outline" className="text-[10px] px-1.5">nav</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50">cta</Badge>
          )}
        </div>
      ),
    },
    {
      header: "Klik",
      cell: (r: { count: number }) => <span className="text-sm font-bold text-blue-600 tabular-nums">{r.count}</span>,
    },
    {
      header: "Orang unik",
      cell: (r: { unique: number }) => <span className="text-sm tabular-nums text-gray-600">{r.unique}</span>,
    },
  ];

  const dwellColumns = [
    {
      header: "Area",
      cell: (r: { group: string }) => <span className="text-sm font-medium text-gray-900">{GROUP_LABEL[r.group] ?? r.group}</span>,
    },
    {
      header: "Rata-rata baca",
      cell: (r: { dwellAvgSec: number | null }) => <span className="text-sm tabular-nums text-gray-700">{fmtSec(r.dwellAvgSec)}</span>,
    },
    {
      header: "Median baca",
      cell: (r: { dwellMedianSec: number | null }) => <span className="text-sm tabular-nums text-gray-700">{fmtSec(r.dwellMedianSec)}</span>,
    },
    {
      header: "Scroll rata-rata",
      cell: (r: { scrollAvgPct: number | null }) => (
        <span className="text-sm tabular-nums text-gray-700">{r.scrollAvgPct != null ? `${Math.round(r.scrollAvgPct)}%` : "-"}</span>
      ),
    },
  ];

  const geoMax = Math.max(1, ...(geo.data?.breakdown.slice(0, 8).map((b) => b.views) ?? []));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={eng.isLoading} />
        ))}
      </div>

      {/* Funnel 7 hari */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Filter className="h-4 w-4 text-blue-500" />
            Corong keterlibatan (7 hari)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {eng.isLoading ? (
            <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            stages.map((s, i) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{s.label}</span>
                  <span className="tabular-nums text-gray-500">
                    <span className="font-bold text-gray-800">{s.value.toLocaleString("id-ID")}</span>
                    {i > 0 && ` (${pct(s.value, stages[0].value)})`}
                  </span>
                </div>
                <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(2, (s.value / maxStage) * 100)}%` }} />
                </div>
              </div>
            ))
          )}
          <p className="text-[11px] text-gray-400 pt-1">
            Jawaban atas &quot;kenapa returning rendah&quot;: berapa pengunjung yang benar-benar membaca lama, lalu kembali lagi.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Klik per label */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <MousePointerClick className="h-4 w-4 text-violet-500" />
              Klik CTA &amp; navigasi (7 hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={clickColumns}
              data={e?.clicksByLabel7d}
              loading={eng.isLoading}
              emptyMessage="Belum ada klik tercatat"
              keyFn={(r) => `${r.type}:${r.label}`}
            />
          </CardContent>
        </Card>

        {/* Dwell/scroll per area */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <ScrollText className="h-4 w-4 text-emerald-500" />
              Kedalaman baca per area (7 hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={dwellColumns}
              data={e?.groups7d}
              loading={eng.isLoading}
              emptyMessage="Belum ada data baca"
              keyFn={(r) => r.group}
            />
          </CardContent>
        </Card>
      </div>

      {/* Geo */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Globe2 className="h-4 w-4 text-blue-500" />
            Asal pengunjung menurut negara (7 hari)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {geo.isLoading ? (
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ) : (geo.data?.breakdown.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-2.5">
              {(geo.data?.breakdown ?? []).slice(0, 8).map((b) => (
                <div key={b.country} className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-gray-700 w-10 shrink-0">{b.country}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(2, (b.views / geoMax) * 100)}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-gray-600 w-24 text-right">
                    {b.views.toLocaleString("id-ID")} ({b.pct}%)
                  </span>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">
                Label negara dari prefix IP — tanpa filtering (keputusan owner 27 Sep); &quot;??&quot; = tidak diketahui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
