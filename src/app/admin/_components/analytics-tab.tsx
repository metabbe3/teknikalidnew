"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import {
  Eye, Users, TrendingUp, Clock, Search, Share2, Globe2,
  ArrowUpRight, ArrowDownRight, Monitor, Smartphone, Tablet,
  Wifi, MapPin, Target, Hash, ExternalLink,
} from "lucide-react";
import { formatVolume } from "@/lib/utils";
import { wibDayStart, wibNextDayStart } from "@/lib/datetime-wib";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    authedViews: number;
    anonViews: number;
    avgViewsPerVisitor: number;
    bounceRate: number;
    realtimeVisitors: number;
    peakHour: { hour: number; label: string; views: number } | null;
    botViews: number;
    botVisitors: number;
    excludedViews: number;
    excludedIps: number;
    suspectedBotIps: number;
  };
  hourly: Array<{ hour: number; label: string; views: number; uniqueVisitors: number }>;
  daily: Array<{ date: string; views: number; uniqueVisitors: number }>;
  sections: Array<{ section: string; label: string; views: number; uniqueVisitors: number }>;
  trafficSources: Array<{ source: string; label: string; views: number; percentage: number }>;
  topKeywords: Array<{ keyword: string; views: number; source: string }>;
  topOrganicPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
    inferredKeywords: string[];
  }>;
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
    avgViewsPerVisitor: number;
    authedViews: number;
    changePct: number | null;
  }>;
  devices: Array<{ category: string; count: number; percentage: number }>;
  browsers: Array<{ category: string; count: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; source: string; count: number }>;
  geo: Array<{ label: string; count: number; percentage: number }>;
  apiTraffic: {
    windowMinutes: number;
    topConsumers: Array<{
      ip: string;
      totalHits: number;
      prefixes: Array<{ prefix: string; hits: number }>;
    }>;
  };
  realtime: Array<{
    ip: string | null;
    path: string;
    source: string;
    keyword: string | null;
    time: string;
    isBot: boolean;
  }>;
  comparison: {
    currentViews: number;
    previousViews: number;
    viewsChangePct: number | null;
    currentUnique: number;
    previousUnique: number;
    uniqueChangePct: number | null;
  };
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  "organic-search": <Search className="h-3.5 w-3.5 text-blue-500" />,
  social: <Share2 className="h-3.5 w-3.5 text-purple-500" />,
  direct: <Globe2 className="h-3.5 w-3.5 text-gray-400" />,
  referral: <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />,
  email: <Hash className="h-3.5 w-3.5 text-amber-500" />,
};

const SOURCE_COLORS: Record<string, string> = {
  "organic-search": "bg-blue-500",
  social: "bg-purple-500",
  direct: "bg-gray-400",
  referral: "bg-emerald-500",
  email: "bg-amber-500",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  Mobile: <Smartphone className="h-3.5 w-3.5" />,
  Desktop: <Monitor className="h-3.5 w-3.5" />,
  Tablet: <Tablet className="h-3.5 w-3.5" />,
};

const QUICK_RANGES = [
  { label: "Today", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [pathFilter, setPathFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const buildUrl = useCallback(() => {
    // Calendar-day WIB bounds: Today = today's WIB day; N Days = last N WIB days inclusive.
    const now = new Date();
    const end = wibNextDayStart(now);
    const start = wibDayStart(new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000));
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });
    if (pathFilter.trim()) params.set("path", pathFilter.trim());
    if (sourceFilter) params.set("source", sourceFilter);
    return `/api/admin/analytics/comprehensive?${params}`;
  }, [rangeDays, pathFilter, sourceFilter]);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics", rangeDays, pathFilter, sourceFilter],
    queryFn: async () => {
      const r = await fetch(buildUrl());
      if (!r.ok) return undefined;
      const json = await r.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  // KPI Cards
  const kpis = [
    {
      title: "Total Views",
      icon: Eye,
      value: formatVolume(data?.overview.totalViews ?? 0),
      subtitle: data?.comparison.viewsChangePct !== null && data?.comparison.viewsChangePct !== undefined
        ? `${data.comparison.viewsChangePct >= 0 ? "+" : ""}${data.comparison.viewsChangePct}%`
        : undefined,
      gradient: "blue" as const,
    },
    {
      title: "Unique Visitors",
      icon: Users,
      value: formatVolume(data?.overview.uniqueVisitors ?? 0),
      subtitle: [
        data?.comparison.uniqueChangePct !== null && data?.comparison.uniqueChangePct !== undefined
          ? `${data.comparison.uniqueChangePct >= 0 ? "+" : ""}${data.comparison.uniqueChangePct}%`
          : null,
        data?.overview.botVisitors ? `🤖 ${data.overview.botVisitors} bot` : null,
      ].filter(Boolean).join(" · "),
      gradient: "emerald" as const,
    },
    {
      title: "Bounce Rate",
      icon: Target,
      value: `${data?.overview.bounceRate ?? 0}%`,
      subtitle: `${data?.overview.avgViewsPerVisitor ?? 0} views/visitor`,
      gradient: "amber" as const,
    },
    {
      title: "Peak Hour",
      icon: Clock,
      value: data?.overview.peakHour?.label ?? "-",
      subtitle: data?.overview.peakHour ? `${formatVolume(data.overview.peakHour.views)} views` : undefined,
      gradient: "rose" as const,
    },
  ];

  // Hourly chart data
  const hourly = data?.hourly ?? [];
  const maxHourly = Math.max(1, ...hourly.map((h) => h.views));

  // Daily chart data
  const daily = data?.daily ?? [];
  const maxDaily = Math.max(1, ...daily.map((d) => d.views));

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Quick Date Range */}
        <div className="flex gap-1">
          {QUICK_RANGES.map((r) => (
            <Button
              key={r.days}
              variant={rangeDays === r.days ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {/* Path Filter */}
        <input
          type="text"
          placeholder="Filter by path (e.g., /stocks/)"
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-56 bg-white"
        />

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
        >
          <option value="">All Sources</option>
          <option value="organic-search">Organic Search</option>
          <option value="social">Social Media</option>
          <option value="direct">Direct</option>
          <option value="referral">Referral</option>
          <option value="email">Email</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* Exclusion summary — proves these numbers are real visitors only */}
      {data && (data.overview.excludedViews > 0 || data.overview.botViews > 0) && (
        <p className="text-xs text-gray-400 -mt-2">
          Excluded from these numbers:{" "}
          <strong className="text-gray-500">{formatVolume(data.overview.excludedViews)}</strong>{" "}
          owner/internal/suspected-bot views
          {data.overview.suspectedBotIps > 0 &&
            ` (${data.overview.suspectedBotIps} suspected-bot IP${data.overview.suspectedBotIps === 1 ? "" : "s"})`}
          {" · "}
          <strong className="text-gray-500">{formatVolume(data.overview.botViews)}</strong> flagged-bot views.
        </p>
      )}

      {/* Traffic by Section — which content drives visits (news vs stocks vs home) */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Traffic by Section
            <span className="text-xs font-normal text-gray-400">— which content drives visits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-28 bg-gray-50 rounded animate-pulse" />
          ) : !data?.sections?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const total = data.sections.reduce((s, x) => s + x.views, 0) || 1;
                return data.sections.map((s) => (
                  <div key={s.section} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-36 font-medium">{s.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${(s.views / total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-blue-600 tabular-nums w-10 text-right">
                      {Math.round((s.views / total) * 100)}%
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums w-16 text-right">
                      {formatVolume(s.views)} views
                    </span>
                    <span className="text-[10px] text-gray-400 tabular-nums w-20 text-right">
                      {s.uniqueVisitors} unique
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Realtime Visitors */}
      {data?.realtime && data.realtime.length > 0 && (
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Wifi className="h-4 w-4 text-purple-500" />
              Live Visitors
              <span className="text-xs font-normal text-gray-400">
                ({data.overview.realtimeVisitors} online · last 5 min)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.realtime.slice(0, 20).map((v, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${v.isBot ? "bg-orange-500" : "bg-green-500 animate-pulse"}`} />
                  {v.isBot && <span className="text-[10px] shrink-0" title="Bot/Crawler">🤖</span>}
                  <span className={`font-mono w-28 shrink-0 ${v.isBot ? "text-gray-400" : "text-gray-500"}`}>{v.ip ?? "anon"}</span>
                  {SOURCE_ICONS[v.source]}
                  <span className={`font-mono font-medium truncate flex-1 ${v.isBot ? "text-gray-400" : "text-gray-800"}`}>{v.path}</span>
                  {v.keyword && (
                    <span className="text-blue-500 font-medium shrink-0 max-w-[150px] truncate">
                      "{v.keyword}"
                    </span>
                  )}
                  <span className="text-gray-400 shrink-0">
                    {new Date(v.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Traffic — top /api consumers (catches slow scrapers under the rate limit) */}
      {data?.apiTraffic && data.apiTraffic.topConsumers.length > 0 && (
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="text-base">📡</span>
              API Consumers
              <span className="text-xs font-normal text-gray-400">
                (top IPs · last {data.apiTraffic.windowMinutes} min)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {data.apiTraffic.topConsumers.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="font-mono w-40 shrink-0 truncate text-gray-600" title={c.ip}>{c.ip}</span>
                  <span className="font-bold text-amber-600 tabular-nums shrink-0 w-10 text-right">{c.totalHits}</span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {c.prefixes.map((p) => (
                      <span key={p.prefix} className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {p.prefix} <span className="font-bold text-gray-800">{p.hits}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Traffic Chart */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Clock className="h-4 w-4 text-blue-500" />
            Traffic by Hour
            <span className="text-xs font-normal text-gray-400">— when visitors come</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
          ) : hourly.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <div className="flex items-end gap-0.5 h-40">
              {hourly.map((h) => {
                const height = Math.max(2, (h.views / maxHourly) * 100);
                const isPeak = data?.overview.peakHour?.hour === h.hour;
                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 pointer-events-none">
                      {h.label} · {h.views} views · {h.uniqueVisitors} unique
                    </div>
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isPeak
                          ? "bg-gradient-to-t from-purple-600 to-purple-400"
                          : "bg-gradient-to-t from-blue-600 to-cyan-400"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    {h.hour % 3 === 0 && (
                      <span className="text-[8px] text-gray-400 tabular-nums font-medium">
                        {h.hour}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Sources + Keywords */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Traffic Sources */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Share2 className="h-4 w-4 text-purple-500" />
              Traffic Sources
              <span className="text-xs font-normal text-gray-400">— where they come from</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-32 bg-gray-50 rounded animate-pulse" />
            ) : !data?.trafficSources?.length ? (
              <p className="text-sm text-gray-400 text-center py-8">No data</p>
            ) : (
              <div className="space-y-3">
                {data.trafficSources.map((src) => {
                  const total = data.trafficSources.reduce((s, x) => s + x.views, 0) || 1;
                  return (
                    <div key={src.source} className="flex items-center gap-3">
                      {SOURCE_ICONS[src.source] ?? <Globe2 className="h-3.5 w-3.5 text-gray-400" />}
                      <span className="text-sm text-gray-700 w-28 font-medium">{src.label}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${SOURCE_COLORS[src.source] ?? "bg-gray-400"}`}
                          style={{ width: `${(src.views / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 tabular-nums w-12 text-right">
                        {src.percentage}%
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums w-12 text-right">
                        {formatVolume(src.views)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Search Keywords + Organic Landing Pages */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Search className="h-4 w-4 text-emerald-500" />
              Top Organic Search Traffic
              <span className="text-xs font-normal text-gray-400">— pages from Google</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-32 bg-gray-50 rounded animate-pulse" />
            ) : !data?.topOrganicPages?.length ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No organic search traffic yet in this period
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {data.topOrganicPages.map((page, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded-lg border-b border-gray-50">
                    <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <a href={page.path} className="text-sm text-blue-600 hover:underline font-medium truncate block">
                        {page.path}
                      </a>
                      {page.inferredKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {page.inferredKeywords.map((kw, j) => (
                            <span key={j} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100">
                              "{kw}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-600 tabular-nums">{page.views}</div>
                      <div className="text-[10px] text-gray-400">{page.uniqueVisitors} unique</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Info note */}
            <p className="text-[10px] text-gray-400 mt-3 italic">
              ℹ️ Google no longer passes search keywords (since 2011). Keywords above are inferred from landing pages. For exact keyword data, connect Google Search Console.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Views Chart */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Daily Views Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ) : daily.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {daily.map((day) => {
                const height = Math.max(4, (day.views / maxDaily) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 pointer-events-none">
                      {day.date}: {day.views} views · {day.uniqueVisitors} unique
                    </div>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums font-medium">
                      {day.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Pages with Attraction Metrics */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Target className="h-4 w-4 text-blue-500" />
            Top Content — Most Attractive Pages
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="h-40 bg-gray-50 rounded animate-pulse" />
          ) : !data?.topPages?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 px-2">Page</th>
                    <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 px-2">Views</th>
                    <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 px-2">Unique</th>
                    <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 px-2">Views/Visitor</th>
                    <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 px-2">Authed</th>
                    <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 px-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.slice(0, 20).map((page, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 px-2">
                        <span className="font-mono text-xs text-gray-800 font-medium truncate max-w-[300px] block">
                          {page.path}
                        </span>
                      </td>
                      <td className="text-right py-2 px-2">
                        <span className="text-sm font-bold text-blue-600 tabular-nums">{page.views}</span>
                      </td>
                      <td className="text-right py-2 px-2">
                        <span className="text-sm font-semibold text-gray-600 tabular-nums">{page.uniqueVisitors}</span>
                      </td>
                      <td className="text-right py-2 px-2">
                        <span className={`text-sm font-semibold tabular-nums ${page.avgViewsPerVisitor > 1.5 ? "text-emerald-600" : "text-gray-500"}`}>
                          {page.avgViewsPerVisitor}
                        </span>
                      </td>
                      <td className="text-right py-2 px-2">
                        <span className="text-xs text-gray-400 tabular-nums">{page.authedViews}</span>
                      </td>
                      <td className="text-right py-2 px-2">
                        {page.changePct === null ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : (
                          <div className={`flex items-center justify-end gap-0.5 ${page.changePct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {page.changePct >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            <span className="text-xs font-bold tabular-nums">{Math.abs(page.changePct)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices + Browsers + Geo */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Devices */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Monitor className="h-4 w-4 text-amber-500" />
              Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-24 bg-gray-50 rounded animate-pulse" />
            ) : (
              <div className="space-y-3">
                {(data?.devices ?? []).map((d) => (
                  <div key={d.category} className="flex items-center gap-3">
                    {DEVICE_ICONS[d.category] ?? <Monitor className="h-3.5 w-3.5" />}
                    <span className="text-sm text-gray-700 w-20 font-medium">{d.category}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 tabular-nums w-8 text-right">{d.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browsers */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Globe2 className="h-4 w-4 text-blue-500" />
              Browsers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-24 bg-gray-50 rounded animate-pulse" />
            ) : (
              <div className="space-y-3">
                {(data?.browsers ?? []).map((b) => (
                  <div key={b.category} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-20 font-medium">{b.category}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${b.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 tabular-nums w-8 text-right">{b.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geo */}
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <MapPin className="h-4 w-4 text-purple-500" />
              Top Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-24 bg-gray-50 rounded animate-pulse" />
            ) : !data?.geo?.length ? (
              <p className="text-xs text-gray-400 text-center py-4">No location data</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.geo.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium truncate flex-1">{g.label}</span>
                    <span className="font-bold text-purple-600 tabular-nums ml-2">{g.count}</span>
                    <span className="text-gray-400 tabular-nums ml-1 w-8 text-right">{g.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      {data?.topReferrers && data.topReferrers.length > 0 && (
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <ExternalLink className="h-4 w-4 text-emerald-500" />
              Top Referrers
              <span className="text-xs font-normal text-gray-400">— sites linking to you</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.topReferrers.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-1 px-2 hover:bg-gray-50 rounded-lg">
                  {SOURCE_ICONS[r.source] ?? <Globe2 className="h-3.5 w-3.5 text-gray-400" />}
                  <span className="text-sm text-gray-700 font-medium flex-1 truncate">{r.referrer}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {r.source.replace("-", " ")}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums w-12 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
