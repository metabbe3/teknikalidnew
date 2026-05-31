"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Activity, Radio } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface ActivityEntry {
  action: string;
  timestamp: string;
  duration: number;
  status: string;
}

interface TickerFreshness {
  ticker: string;
  lastUpdate: string;
}

interface IntradayData {
  activityEntries: ActivityEntry[];
  tickerFreshness: TickerFreshness[];
}

function freshnessStatus(lastUpdate: string): { label: string; variant: "default" | "secondary" | "destructive"; className: string } {
  const age = Date.now() - new Date(lastUpdate).getTime();
  if (age < 3_600_000) return { label: "Fresh", variant: "default", className: "bg-emerald-500 hover:bg-emerald-600" };
  if (age < 14_400_000) return { label: "1-4h", variant: "secondary", className: "bg-amber-500 hover:bg-amber-600 text-white" };
  return { label: "Stale", variant: "destructive", className: "" };
}

export default function IntradayLogsPage() {
  const { data, isLoading } = useQuery<IntradayData>({
    queryKey: ["admin-intraday-logs"],
    queryFn: async () => {
      const r = await fetch("/api/admin/intraday-logs");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const activityColumns = [
    {
      header: "Status",
      cell: (r: ActivityEntry) => (
        <Badge variant={r.status === "success" ? "default" : "destructive"}
          className={r.status === "success" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
          {r.status}
        </Badge>
      ),
    },
    { header: "Action", cell: (r: ActivityEntry) => <span className="text-sm font-semibold text-gray-800">{r.action}</span> },
    { header: "Duration", cell: (r: ActivityEntry) => <span className="text-sm font-mono tabular-nums font-semibold text-blue-600">{r.duration}s</span> },
    { header: "Time", cell: (r: ActivityEntry) => <span className="text-xs text-gray-400 font-mono">{timeAgo(r.timestamp)}</span>, className: "text-right" },
  ];

  const freshnessColumns = [
    { header: "Ticker", cell: (r: TickerFreshness) => <span className="font-mono font-bold text-sm text-gray-900">{r.ticker}</span> },
    { header: "Last Update", cell: (r: TickerFreshness) => <span className="text-xs text-gray-400">{timeAgo(r.lastUpdate)}</span> },
    {
      header: "Status",
      cell: (r: TickerFreshness) => {
        const { label, variant, className } = freshnessStatus(r.lastUpdate);
        return <Badge variant={variant} className={className}>{label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Intraday Sync Logs"
        description="Real-time price sync history and ticker freshness"
        icon={Activity}
      />

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Radio className="h-4 w-4 text-emerald-500" />
            Recent Intraday Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={activityColumns}
            data={data?.activityEntries}
            loading={isLoading}
            emptyMessage="No intraday activity recorded since last restart"
            keyFn={(_, i) => i}
          />
        </CardContent>
      </Card>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Ticker Freshness</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={freshnessColumns}
            data={data?.tickerFreshness}
            loading={isLoading}
            emptyMessage="No ticker data available"
            keyFn={(r) => r.ticker}
          />
        </CardContent>
      </Card>
    </div>
  );
}
