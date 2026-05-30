"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Target, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatVolume } from "@/lib/utils";

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
    directions: { direction: string; count: number }[];
    byStock: { ticker: string; count: number }[];
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
  dailyStats: { date: string; count: number }[];
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

function outcomeBadge(outcome: string | null) {
  if (!outcome) return <Badge variant="secondary" className="bg-gray-100 text-gray-500">Pending</Badge>;
  if (outcome === "CORRECT") return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Correct</Badge>;
  if (outcome === "INCORRECT") return <Badge variant="destructive">Incorrect</Badge>;
  return <Badge variant="secondary" className="bg-gray-200 text-gray-500">Expired</Badge>;
}

function directionBadge(direction: string | null) {
  if (direction === "UP") return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"><TrendingUp className="h-3 w-3" />Bullish</Badge>;
  if (direction === "DOWN") return <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" />Bearish</Badge>;
  return <Badge variant="secondary">-</Badge>;
}

export default function PredictionsPage() {
  const { data, isLoading } = useQuery<PredictionData>({
    queryKey: ["admin-prediction-stats"],
    queryFn: () => fetch("/api/admin/prediction-stats").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Total Predictions", icon: Target, value: formatVolume(data?.overview.total ?? 0), gradient: "blue" as const },
    { title: "Pending", icon: Clock, value: formatVolume(data?.overview.pending ?? 0), subtitle: "Awaiting resolution", gradient: "amber" as const },
    { title: "Correct Rate", icon: CheckCircle, value: `${data?.overview.accuracyPct ?? 0}%`, subtitle: `${data?.overview.correct ?? 0} correct`, gradient: "emerald" as const },
    { title: "Incorrect", icon: XCircle, value: formatVolume(data?.overview.incorrect ?? 0), subtitle: `${data?.overview.expired ?? 0} expired`, gradient: "rose" as const },
  ];

  const bullCount = data?.distribution.directions.find((d) => d.direction === "UP")?.count ?? 0;
  const bearCount = data?.distribution.directions.find((d) => d.direction === "DOWN")?.count ?? 0;
  const totalDir = bullCount + bearCount || 1;

  const predictorColumns = [
    {
      header: "User",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className="text-sm font-medium">@{r.username ?? "unknown"}</span>
      ),
    },
    {
      header: "Predictions",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className="text-sm font-semibold text-blue-600 tabular-nums">{r.total}</span>
      ),
    },
    {
      header: "Correct",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className="text-sm tabular-nums text-emerald-600">{r.correct}</span>
      ),
    },
    {
      header: "Accuracy",
      cell: (r: PredictionData["topPredictors"][0]) => (
        <span className={`text-sm font-bold tabular-nums ${r.accuracyPct !== null && r.accuracyPct >= 50 ? "text-emerald-600" : "text-rose-500"}`}>
          {r.accuracyPct !== null ? `${r.accuracyPct}%` : "-"}
        </span>
      ),
    },
  ];

  const stockColumns = [
    {
      header: "Ticker",
      cell: (r: { ticker: string; count: number }) => (
        <span className="font-mono font-bold text-sm text-gray-900">{r.ticker.replace(".JK", "")}</span>
      ),
    },
    {
      header: "Predictions",
      cell: (r: { count: number }) => (
        <span className="text-sm font-semibold text-blue-600 tabular-nums">{r.count}</span>
      ),
    },
  ];

  const recentColumns = [
    {
      header: "Ticker",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="font-mono text-sm font-medium">{r.tickerTag?.replace(".JK", "") ?? "-"}</span>
      ),
    },
    {
      header: "Direction",
      cell: (r: PredictionData["recentPredictions"][0]) => directionBadge(r.predictionDirection),
    },
    {
      header: "Target",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="text-sm font-mono tabular-nums text-gray-600">
          {r.predictionTarget ? `Rp ${r.predictionTarget.toLocaleString("id-ID")}` : "-"}
        </span>
      ),
    },
    {
      header: "Outcome",
      cell: (r: PredictionData["recentPredictions"][0]) => outcomeBadge(r.predictionOutcome),
    },
    {
      header: "Author",
      cell: (r: PredictionData["recentPredictions"][0]) => (
        <span className="text-sm text-gray-600">@{r.author.username ?? "unknown"}</span>
      ),
    },
  ];

  const dailyStats = data?.dailyStats ?? [];
  const maxDaily = Math.max(1, ...dailyStats.map((d) => d.count));

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Prediction Analytics"
        description="Track prediction accuracy, distribution, and top predictors"
        icon={Target}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bull/Bear Distribution */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-700">Bull vs Bear Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(bullCount / totalDir) * 100}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${(bearCount / totalDir) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <TrendingUp className="h-3.5 w-3.5" /> Bullish {bullCount}
              </span>
              <span className="flex items-center gap-1.5 text-rose-500 font-medium">
                <TrendingDown className="h-3.5 w-3.5" /> Bearish {bearCount}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Predicted Stocks */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-700">Top Predicted Stocks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={stockColumns}
              data={data?.distribution.byStock}
              loading={isLoading}
              emptyMessage="No predictions yet"
              keyFn={(r) => r.ticker}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Predictors */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Top Predictors (min 5 resolved)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={predictorColumns}
            data={data?.topPredictors}
            loading={isLoading}
            emptyMessage="No predictors with 5+ resolved predictions yet"
            keyFn={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* 14-day volume */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Prediction Volume (14 Days)</CardTitle>
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
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-500 to-violet-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} predictions`}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums">{day.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700">Recent Predictions</CardTitle>
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
