"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { ManualTriggerButtons } from "@/components/admin/manual-trigger-buttons";
import { Clock, Zap } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface ActivityEntry {
  action: string;
  timestamp: string;
  duration: number;
  status: string;
}

interface StatusData {
  recentActivity: ActivityEntry[];
}

const CRON_SCHEDULES = [
  { name: "EOD Sync", schedule: "16:30 WIB (market close)", route: "/api/cron/sync-eod", description: "Fetches end-of-day prices and calculates technical indicators for all active stocks", color: "blue" },
  { name: "Intraday Sync", schedule: "Every 15 min during market hours", route: "/api/cron/sync-intraday", description: "Updates real-time prices for IDX40 + watchlisted stocks", color: "emerald" },
];

export default function CronConfigPage() {
  const { data, isLoading } = useQuery<StatusData>({
    queryKey: ["admin-cron-status"],
    queryFn: () => fetch("/api/admin/status").then((r) => r.json()),
  });

  const cronActivity = (data?.recentActivity ?? []).filter(
    (e) => e.action.toLowerCase().includes("sync") || e.action.toLowerCase().includes("eod"),
  );

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
        title="Cron Configuration"
        description="Scheduled jobs and manual trigger controls"
        icon={Clock}
      />

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Clock className="h-4 w-4 text-blue-500" />
            Scheduled Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {CRON_SCHEDULES.map((cron) => (
            <div key={cron.name} className={`flex items-start justify-between p-4 rounded-xl border border-gray-200/80 bg-white shadow-md shadow-gray-200/30 admin-accent-${cron.color}-left`}>
              <div>
                <p className="text-sm font-bold text-gray-800">{cron.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cron.description}</p>
                <p className="text-xs font-mono text-gray-400 mt-1">{cron.route}</p>
              </div>
              <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200 shrink-0">{cron.schedule}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Zap className="h-4 w-4 text-amber-500" />
            Manual Triggers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ManualTriggerButtons />
        </CardContent>
      </Card>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Recent Sync Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={activityColumns}
            data={cronActivity}
            loading={isLoading}
            emptyMessage="No sync activity recorded since last restart"
            keyFn={(_, i) => i}
          />
        </CardContent>
      </Card>
    </div>
  );
}
