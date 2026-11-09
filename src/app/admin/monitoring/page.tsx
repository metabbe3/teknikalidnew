"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, AlertTriangle, Timer, RefreshCw } from "lucide-react";

/**
 * adm-2026-11-09 — Monitoring Page: 1 halaman utk lihat API lambat + query berat + error.
 * Sumber: /api/admin/monitoring (latency ring + pg_stat_statements + AppErrorLog).
 */

interface LatencyRow {
  route: string;
  count: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  slow: number;
  err5xx?: number;
}
interface QueryRow {
  avgMs: number;
  calls: number;
  totalS: number;
  query: string;
}
interface ErrorRow {
  kind: string;
  path: string | null;
  message: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}
interface MonData {
  latency: { live: LatencyRow[]; recent: LatencyRow[] };
  queries: QueryRow[];
  errors: ErrorRow[];
}

function msBadge(ms: number): "default" | "secondary" | "destructive" | "outline" {
  if (ms >= 500) return "destructive";
  if (ms >= 200) return "secondary";
  return "default";
}

export default function MonitoringPage() {
  const [view, setView] = useState<"latency" | "queries" | "errors">("latency");

  const { data, isLoading, error, refetch, isFetching } = useQuery<MonData>({
    queryKey: ["admin-monitoring"],
    queryFn: async () => {
      const r = await fetch("/api/admin/monitoring");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const mergedLatency = (() => {
    if (!data) return [] as LatencyRow[];
    const byRoute = new Map<string, LatencyRow>();
    for (const row of [...data.latency.live, ...data.latency.recent]) {
      const prev = byRoute.get(row.route);
      if (!prev || (row.p95Ms ?? 0) >= (prev.p95Ms ?? 0)) byRoute.set(row.route, row);
    }
    return [...byRoute.values()].sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0));
  })();

  const worstP95 = mergedLatency[0]?.p95Ms ?? 0;
  const slowCount = mergedLatency.filter((r) => r.p95Ms >= 500).length;
  const worstQuery = data?.queries[0]?.avgMs ?? 0;
  const errCount = data?.errors.length ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Monitoring"
        description="API lambat · query berat · error — satu halaman, refresh tiap 30 dtk"
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminKpiCard title="Endpoint Terlama (p95)" value={`${worstP95} ms`} icon={Timer} />
        <AdminKpiCard title="Endpoint Lambat (≥500ms)" value={String(slowCount)} icon={Activity} />
        <AdminKpiCard title="Query Terberat (avg)" value={`${worstQuery} ms`} icon={Database} />
        <AdminKpiCard title="Error Aktif" value={String(errCount)} icon={AlertTriangle} />
      </div>

      <div className="flex gap-2 border-b pb-2">
        {(["latency", "queries", "errors"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 text-sm ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {v === "latency" ? "⏱ API Latency" : v === "queries" ? "🗄 Slow Queries" : "⚠ Errors"}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {error && <p className="text-sm text-destructive">Gagal memuat: {String(error)}</p>}

      {view === "latency" && (
        <Card>
          <CardHeader><CardTitle>Latency per Endpoint (p95)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Endpoint</th>
                  <th className="py-2 pr-4">Req</th>
                  <th className="py-2 pr-4">Avg</th>
                  <th className="py-2 pr-4">p95</th>
                  <th className="py-2 pr-4">p99</th>
                  <th className="py-2 pr-4">Max</th>
                  <th className="py-2 pr-4">Slow</th>
                  <th className="py-2">5xx</th>
                </tr>
              </thead>
              <tbody>
                {mergedLatency.slice(0, 30).map((r) => (
                  <tr key={r.route} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{r.route}</td>
                    <td className="py-2 pr-4">{r.count}</td>
                    <td className="py-2 pr-4">{r.avgMs} ms</td>
                    <td className="py-2 pr-4"><Badge variant={msBadge(r.p95Ms)}>{r.p95Ms} ms</Badge></td>
                    <td className="py-2 pr-4">{r.p99Ms} ms</td>
                    <td className="py-2 pr-4">{r.maxMs} ms</td>
                    <td className="py-2 pr-4">{r.slow}</td>
                    <td className="py-2">{r.err5xx ?? 0}</td>
                  </tr>
                ))}
                {!mergedLatency.length && !isLoading && (
                  <tr><td colSpan={8} className="py-4 text-muted-foreground">Belum ada data latency — akan terisi dalam ±30 dtk setelah ada traffic API.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {view === "queries" && (
        <Card>
          <CardHeader><CardTitle>Query Terberat (pg_stat_statements, by avg)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.queries ?? []).map((q, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <Badge variant={q.avgMs >= 200 ? "destructive" : "default"}>{q.avgMs} ms</Badge>
                  <span className="text-muted-foreground">{q.calls}× · total {q.totalS}s</span>
                </div>
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">{q.query}</pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {view === "errors" && (
        <Card>
          <CardHeader><CardTitle>Error Terbaru (AppErrorLog)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.errors ?? []).map((e, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{e.kind}</Badge>
                  <span className="font-mono text-xs">{e.path ?? "-"}</span>
                  <span className="text-muted-foreground">×{e.count}</span>
                </div>
                <p className="mt-1 break-all text-xs text-muted-foreground">{e.message}</p>
              </div>
            ))}
            {!data?.errors.length && !isLoading && <p className="text-sm text-muted-foreground">Tidak ada error tercatat 🎉</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
