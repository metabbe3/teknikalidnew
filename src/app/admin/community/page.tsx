"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Users, UserPlus, Activity, MessageSquare, Heart, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { formatVolume } from "@/lib/utils";

interface CommunityData {
  overview: {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    activeUsersToday: number;
    activeUsersThisWeek: number;
    totalPosts: number;
    postsToday: number;
    totalComments: number;
    commentsToday: number;
    totalLikes: number;
    likesToday: number;
  };
  moderation: { pending: number; reviewed: number; dismissed: number };
  topPosts: Array<{
    id: string;
    content: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    tickerTag: string | null;
    author: { username: string | null; name: string | null; image: string | null };
  }>;
  topFollowedStocks: Array<{ ticker: string; followers: number }>;
  topDiscussedStocks: Array<{ ticker: string; posts: number }>;
  topActiveUsers: Array<{
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    reputation: number;
    posts: number;
    comments: number;
  }>;
  dailyStats: Array<{ date: string; users: number; posts: number; comments: number }>;
}

export default function CommunityPage() {
  const { data, isLoading } = useQuery<CommunityData>({
    queryKey: ["admin-community-stats"],
    queryFn: async () => {
      const r = await fetch("/api/admin/community-stats");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const kpis = [
    { title: "Total Users", icon: Users, value: formatVolume(data?.overview.totalUsers ?? 0), subtitle: `${data?.overview.newUsersToday ?? 0} new today`, gradient: "blue" as const },
    { title: "Active This Week", icon: Activity, value: formatVolume(data?.overview.activeUsersThisWeek ?? 0), subtitle: `${data?.overview.activeUsersToday ?? 0} today`, gradient: "emerald" as const },
    { title: "New This Week", icon: UserPlus, value: formatVolume(data?.overview.newUsersThisWeek ?? 0), gradient: "amber" as const },
    { title: "Total Posts", icon: MessageSquare, value: formatVolume(data?.overview.totalPosts ?? 0), subtitle: `${data?.overview.postsToday ?? 0} today`, gradient: "blue" as const },
    { title: "Comments", icon: TrendingUp, value: formatVolume(data?.overview.totalComments ?? 0), subtitle: `${data?.overview.commentsToday ?? 0} today`, gradient: "emerald" as const },
    { title: "Likes", icon: Heart, value: formatVolume(data?.overview.totalLikes ?? 0), subtitle: `${data?.overview.likesToday ?? 0} today`, gradient: "rose" as const },
  ];

  // Daily activity bars (max value for scaling)
  const dailyStats = data?.dailyStats ?? [];
  const maxActivity = Math.max(1, ...dailyStats.map((d) => d.posts + d.comments));

  const topPostsColumns = [
    {
      header: "Content",
      cell: (r: CommunityData["topPosts"][0]) => (
        <span className="text-sm text-gray-800 line-clamp-1 max-w-[300px] block font-medium">{r.content}</span>
      ),
    },
    {
      header: "Author",
      cell: (r: CommunityData["topPosts"][0]) => (
        <span className="text-sm font-bold text-blue-700">@{r.author.username ?? "unknown"}</span>
      ),
    },
    {
      header: "Likes",
      cell: (r: CommunityData["topPosts"][0]) => (
        <span className="text-sm font-bold text-rose-500 tabular-nums">{r.likesCount}</span>
      ),
    },
    {
      header: "Comments",
      cell: (r: CommunityData["topPosts"][0]) => (
        <span className="text-sm font-semibold tabular-nums text-gray-600">{r.commentsCount}</span>
      ),
    },
    {
      header: "Stock",
      cell: (r: CommunityData["topPosts"][0]) => (
        r.tickerTag ? <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200 font-semibold">{r.tickerTag}</Badge> : <span className="text-xs text-gray-400">-</span>
      ),
    },
  ];

  const activeUsersColumns = [
    {
      header: "User",
      cell: (r: CommunityData["topActiveUsers"][0]) => (
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
      header: "Posts",
      cell: (r: CommunityData["topActiveUsers"][0]) => (
        <span className="text-sm font-bold text-blue-600 tabular-nums">{r.posts}</span>
      ),
    },
    {
      header: "Comments",
      cell: (r: CommunityData["topActiveUsers"][0]) => (
        <span className="text-sm font-semibold tabular-nums text-gray-600">{r.comments}</span>
      ),
    },
    {
      header: "Rep",
      cell: (r: CommunityData["topActiveUsers"][0]) => (
        <span className="text-sm font-bold tabular-nums text-amber-600">{r.reputation}</span>
      ),
    },
  ];

  const stocksColumns = [
    {
      header: "Ticker",
      cell: (r: { ticker: string; followers?: number; posts?: number }) => (
        <span className="font-mono font-bold text-sm text-gray-900">{r.ticker}</span>
      ),
    },
    {
      header: "Followers",
      cell: (r: { followers?: number }) => (
        <span className="text-sm font-semibold text-blue-600 tabular-nums">{r.followers ?? 0}</span>
      ),
    },
    {
      header: "Discussions",
      cell: (r: { posts?: number }) => (
        <span className="text-sm tabular-nums text-gray-600">{r.posts ?? 0}</span>
      ),
    },
  ];

  // Merge top followed + top discussed stocks
  const allStocks = mergeStocks(data?.topFollowedStocks ?? [], data?.topDiscussedStocks ?? []);

  return (
    <div className="space-y-6 fade-in">
      <AdminPageHeader
        title="Community Analytics"
        description="User activity, engagement metrics, and content insights"
        icon={BarChart3}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* 14-day activity chart */}
      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="text-sm font-bold text-gray-800">Activity Trend (14 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ) : dailyStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity data yet</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {dailyStats.map((day) => {
                const total = day.posts + day.comments;
                const height = Math.max(4, (total / maxActivity) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-indigo-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.posts} posts, ${day.comments} comments`}
                    />
                    <span className="text-[9px] text-gray-400 tabular-nums font-medium">
                      {day.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-indigo-400" />
              <span className="text-[10px] text-gray-500 font-medium">Posts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-teal-400" />
              <span className="text-[10px] text-gray-500 font-medium">Comments</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Users className="h-4 w-4 text-blue-500" />
              Most Active Users (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={activeUsersColumns}
              data={data?.topActiveUsers}
              loading={isLoading}
              emptyMessage="No active users this week"
              keyFn={(r) => r.id}
            />
          </CardContent>
        </Card>

        <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top Stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={stocksColumns}
              data={allStocks}
              loading={isLoading}
              emptyMessage="No stock data available"
              keyFn={(r) => r.ticker}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Heart className="h-4 w-4 text-rose-500" />
            Most Liked Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={topPostsColumns}
            data={data?.topPosts}
            loading={isLoading}
            emptyMessage="No posts with likes yet"
            keyFn={(r) => r.id}
          />
        </CardContent>
      </Card>

      <Card className="border-gray-200/80 shadow-md shadow-gray-200/30">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Shield className="h-4 w-4 text-amber-500" />
            Moderation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-amber-600 tabular-nums">{data?.moderation.pending ?? 0}</p>
              <p className="text-xs text-amber-500 mt-1 font-medium">Pending</p>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">{data?.moderation.reviewed ?? 0}</p>
              <p className="text-xs text-emerald-500 mt-1 font-medium">Reviewed</p>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200/80 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-gray-600 tabular-nums">{data?.moderation.dismissed ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Dismissed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function mergeStocks(
  followed: Array<{ ticker: string; followers: number }>,
  discussed: Array<{ ticker: string; posts: number }>,
) {
  const map = new Map<string, { ticker: string; followers: number; posts: number }>();
  for (const s of followed) {
    map.set(s.ticker, { ticker: s.ticker, followers: s.followers, posts: 0 });
  }
  for (const s of discussed) {
    const existing = map.get(s.ticker);
    if (existing) {
      existing.posts = s.posts;
    } else {
      map.set(s.ticker, { ticker: s.ticker, followers: 0, posts: s.posts });
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.followers + b.posts) - (a.followers + a.posts));
}
