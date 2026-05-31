"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { Activity, FileText } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface SyncLog {
  date: string;
  pricesWritten: number;
  indicatorsWritten: number;
}

interface ActivityEntry {
  action: string;
  timestamp: string;
  duration: number;
  status: string;
}

interface EodData {
  syncLogs: SyncLog[];
  activityEntries: ActivityEntry[];
}

export default function EodLogsPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const { data, isLoading } = useQuery<EodData>({
    queryKey: ["admin-eod-logs", from, to],
    queryFn: async () => {
      const r = await fetch(`/api/admin/eod-logs?from=${from}&to=${to}`);
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const syncColumns = [
    { header: "Date", cell: (r: SyncLog) => <span className="font-bold text-gray-900">{r.date}</span> },
    { header: "Prices", cell: (r: SyncLog) => <span className="tabular-nums font-bold text-blue-600">{r.pricesWritten}</span> },
    { header: "Indicators", cell: (r: SyncLog) => <span className="tabular-nums font-bold text-violet-600">{r.indicatorsWritten}</span> },
    {
      header: "Status",
      cell: (r: SyncLog) => (
        <Badge variant={r.pricesWritten > 0 ? "default" : "destructive"}
          className={r.pricesWritten > 0 ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
          {r.pricesWritten > 0 ? "OK" : "Empty"}
        </Badge>
      ),
    },
  ];

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

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="EOD Sync Logs"
        description="End-of-day sync history with price and indicator counts"
        icon={FileText}
        actions={<DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />}
      />

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Daily Sync Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={syncColumns}
            data={data?.syncLogs}
            loading={isLoading}
            emptyMessage="No EOD sync data in selected range"
            keyFn={(r) => r.date}
          />
        </CardContent>
      </Card>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Activity className="h-4 w-4 text-blue-500" />
            Recent EOD Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={activityColumns}
            data={data?.activityEntries}
            loading={isLoading}
            emptyMessage="No EOD activity recorded since last restart"
            keyFn={(_, i) => i}
          />
        </CardContent>
      </Card>
    </div>
  );
}
