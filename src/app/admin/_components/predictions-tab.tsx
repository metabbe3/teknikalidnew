"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { BarChart3, TrendingUp, Target, AlertTriangle, Trophy } from "lucide-react";
import { formatVolume } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

interface PredictionData {
  overview: {
    total: number;
    pending: number;
    correct: number;
    incorrect: number;
    expired: number;
    accuracyPct: number;
  };
  distribution: {
    directions: Array<{ direction: string; count: number }>;
    byStock: Array<{ ticker: string; count: number }>;
  };
  topPredictors: Array<{
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    total: number;
    correct: number;
    accuracyPct: number | null;
  }>;
  dailyStats: Array<{ date: string; count: number }>;
  recentPredictions: Array<{
    id: string;
    tickerTag: string | null;
    predictionDirection: string | null;
    predictionTarget: number | null;
    predictionOutcome: string | null;
    createdAt: string;
    author: { username: string | null; name: string | null };
  }>;
}

export function PredictionsTab() {
  const { data, isLoading } = useQuery<PredictionData>({
    queryKey: ["admin-prediction-stats"],
    queryFn: async () => {
      const r = await fetch("/api/admin/prediction-stats");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Total Predictions", icon: BarChart3, value: formatVolume(data?.overview.total ?? 0), gradient: "blue" as const },
    { title: "Pending", icon: Target, value: formatVolume(data?.overview.pending ?? 0), gradient: "amber" as const },
    {
      title: "Accuracy",
      icon: TrendingUp,
      value: `${data?.overview.accuracyPct ?? 0}%`,
      subtitle: `${formatVolume(data?.overview.correct ?? 0)} correct of ${formatVolume((data?.overview.correct ?? 0) + (data?.overview.incorrect ?? 0) + (data?.overview.expired ?? 0))} resolved`,
      gradient: "emerald" as const,
    },
    { title: "Incorrect", icon: AlertTriangle, value: formatVolume(data?.overview.incorrect ?? 0), gradient: "rose" as const },
  ];

  const recentColumns = [
    {
      header: "Ticker",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="font-mono font-extrabold text-sm text-gray-900">
          {r.tickerTag?.replace(".JK", "") ?? "-"}
        </span>
      ),
    },
    {
      header: "Direction",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <Badge
          variant="outline"
          className={`text-xs font-semibold ${
            r.predictionDirection === "BULLISH"
              ? "border-emerald-300 text-emerald-700 bg-emerald-50"
              : r.predictionDirection === "BEARISH"
                ? "border-rose-300 text-rose-700 bg-rose-50"
                : ""
          }`}
        >
          {r.predictionDirection ?? "-"}
        </Badge>
      ),
    },
    {
      header: "Target",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="text-sm tabular-nums text-gray-600">
          {r.predictionTarget != null ? `${r.predictionTarget}` : "-"}
        </span>
      ),
    },
    {
      header: "Outcome",
      cell: (r: PredictionData["recentPredictions"][0]) => {
        if (!r.predictionOutcome) {
          return <Badge variant="secondary" className="text-xs">Pending</Badge>;
        }
        const colorMap: Record<string, string> = {
          CORRECT: "bg-emerald-500 hover:bg-emerald-600",
          INCORRECT: "bg-rose-500 hover:bg-rose-600",
          EXPIRED: "bg-gray-400 hover:bg-gray-500",
        };
        return (
          <Badge className={`text-xs text-white ${colorMap[r.predictionOutcome] ?? ""}`}>
            {r.predictionOutcome}
          </Badge>
        );
      },
    },
    {
      header: "Author",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="text-sm font-bold text-blue-700">
          @{r.author.username ?? r.author.name ?? "unknown"}
        </span>
      ),
    },
    {
      header: "Created",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="text-xs text-gray-400 font-mono">{timeAgo(r.createdAt)}</span>
      ),
      className: "text-right",
    },
  ];

  const topPredictorsColumns = [
    {
      header: "Predictor",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 ring-1 ring-blue-100">
            <AvatarImage src={r.image ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold">
              {(r.username ?? r.name ?? "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-bold text-gray-800">@{r.username ?? "unknown"}</span>
        </div>
      ),
    },
    {
      header: "Total",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className="text-sm font-bold text-blue-600 tabular-nums">{r.total}</span>
      ),
    },
    {
      header: "Correct",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className="text-sm font-semibold text-emerald-600 tabular-nums">{r.correct}</span>
      ),
    },
    {
      header: "Accuracy",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className="text-sm font-extrabold text-amber-600 tabular-nums">
          {r.accuracyPct != null ? `${r.accuracyPct}%` : "-"}
        </span>
      ),
    },
  ];

  const stockColumns = [
    {
      header: "Ticker",
      cell: (r: { ticker: string; count: number }) => (
        <span className="font-mono font-extrabold text-sm text-gray-900">
          {r.ticker.replace(".JK", "")}
        </span>
      ),
    },
    {
      header: "Predictions",
      cell: (r: { ticker: string; count: number }) => (
        <span className="text-sm font-bold text-violet-600 tabular-nums">{r.count}</span>
      ),
    },
  ];

  // Daily stats bar chart
  const dailyStats = data?.dailyStats ?? [];
  const maxDaily = Math.max(1, ...dailyStats.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* Prediction Volume Chart */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Prediction Volume (14 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ) : dailyStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No prediction data yet</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {dailyStats.map((day) => {
                const height = Math.max(4, (day.count / maxDaily) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-violet-600 to-indigo-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} predictions`}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums font-medium">{day.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Predictors */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Predictors (Min 5 Resolved)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={topPredictorsColumns}
              data={data?.topPredictors}
              loading={isLoading}
              emptyMessage="No predictors with 5+ resolved predictions"
              keyFn={(r) => r.id}
            />
          </CardContent>
        </Card>

        {/* Most Predicted Stocks */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Most Predicted Stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={stockColumns}
              data={data?.distribution.byStock}
              loading={isLoading}
              emptyMessage="No stock prediction data"
              keyFn={(r) => r.ticker}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Predictions */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Recent Predictions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={recentColumns}
            data={data?.recentPredictions}
            loading={isLoading}
            emptyMessage="No predictions yet"
            keyFn={(r) => r.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
