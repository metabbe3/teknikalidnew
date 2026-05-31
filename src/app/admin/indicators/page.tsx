"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { BarChart3, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface IndicatorEntry {
  ticker: string;
  name: string;
  date: string | null;
  interval: string | null;
  status: "fresh" | "stale" | "missing";
  fieldsPopulated: number;
  totalFields: number;
}

interface IndicatorData {
  indicators: IndicatorEntry[];
  summary: { total: number; fresh: number; stale: number; missing: number };
}

export default function IndicatorsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<IndicatorData>({
    queryKey: ["admin-indicators"],
    queryFn: async () => {
      const r = await fetch("/api/admin/indicators");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!data?.indicators) return [];
    const q = search.toLowerCase();
    if (!q) return data.indicators;
    return data.indicators.filter(
      (i) => i.ticker.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
    );
  }, [data?.indicators, search]);

  const columns = [
    { header: "Ticker", cell: (r: IndicatorEntry) => <span className="font-mono font-bold text-sm text-gray-900">{r.ticker}</span> },
    { header: "Name", cell: (r: IndicatorEntry) => <span className="text-sm text-gray-700">{r.name}</span> },
    {
      header: "Last Calculated",
      cell: (r: IndicatorEntry) => (
        <span className="text-xs text-gray-400">
          {r.date ? new Date(r.date).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      header: "Coverage",
      cell: (r: IndicatorEntry) => {
        const pct = r.totalFields > 0 ? Math.round((r.fieldsPopulated / r.totalFields) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono tabular-nums text-gray-700">
              {r.fieldsPopulated}/{r.totalFields}
            </span>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (r: IndicatorEntry) => {
        const styles: Record<string, string> = {
          fresh: "bg-emerald-500 hover:bg-emerald-600 text-white",
          stale: "bg-amber-500 hover:bg-amber-600 text-white",
          missing: "bg-rose-500 hover:bg-rose-600 text-white",
        };
        return <Badge className={styles[r.status] ?? ""}>{r.status}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Indicator Database"
        description="Technical indicator coverage across all active stocks"
        icon={BarChart3}
        actions={
          <Input
            placeholder="Search ticker or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <AdminKpiCard title="Total Stocks" icon={BarChart3} value={data?.summary.total ?? 0} loading={isLoading} gradient="blue" />
        <AdminKpiCard title="Fresh" icon={CheckCircle} value={data?.summary.fresh ?? 0} loading={isLoading} gradient="emerald" />
        <AdminKpiCard title="Stale" icon={AlertTriangle} value={data?.summary.stale ?? 0} loading={isLoading} gradient="amber" />
        <AdminKpiCard title="Missing" icon={XCircle} value={data?.summary.missing ?? 0} loading={isLoading} gradient="rose" />
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        emptyMessage="No indicator data available"
        keyFn={(r) => r.ticker}
      />
    </div>
  );
}
