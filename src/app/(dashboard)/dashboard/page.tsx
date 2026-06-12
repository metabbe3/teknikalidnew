"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  BarChart3,
  Calculator,
  Bookmark,
  TrendingUp,
  TrendingDown,
  Wallet,
  Award,
  MessageSquare,
  ArrowRight,
  Plus,
} from "lucide-react";
import { formatRp, formatPercent, changeColor, stripJk } from "@/lib/utils";

const BADGE_STYLES: Record<string, { bg: string; dot: string }> = {
  amber: { bg: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  purple: { bg: "bg-purple-50 text-purple-700 border border-purple-200", dot: "bg-purple-500" },
  gold: { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", dot: "bg-yellow-500" },
  teal: { bg: "bg-teal-50 text-teal-700 border border-teal-200", dot: "bg-teal-500" },
  blue: { bg: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  indigo: { bg: "bg-indigo-50 text-indigo-700 border border-indigo-200", dot: "bg-indigo-500" },
  cyan: { bg: "bg-cyan-50 text-cyan-700 border border-cyan-200", dot: "bg-cyan-500" },
  slate: { bg: "bg-slate-50 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
};

const tools = [
  { label: "Bottom Fishing Radar", href: "/dashboard/bottom-fishing", icon: LineChart, desc: "Find oversold stocks with reversal potential" },
  { label: "Market Structure", href: "/dashboard/market-structure", icon: BarChart3, desc: "Swing point analysis and zigzag visualization" },
  { label: "Trading Plan Calculator", href: "/dashboard/trading-plan", icon: Calculator, desc: "Generate AI-powered trading plans" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className ?? ""}`} />;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useDashboardSummary();
  const userName = session?.user?.username ?? session?.user?.name ?? "Trader";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Berikut ringkasan aktivitas trading dan portfolio kamu hari ini.
        </p>
      </div>

      {/* Top Cards: Paper Trading + Reputation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Paper Trading Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent" />
              Paper Trading
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : data?.paperTrading ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo</p>
                  <p className="text-xl font-semibold">{formatRp(data.paperTrading.balance)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Nilai</p>
                    <p className="text-sm font-medium">{formatRp(data.paperTrading.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P&L</p>
                    <p className={`text-sm font-semibold ${changeColor(data.paperTrading.totalPnl)}`}>
                      {data.paperTrading.totalPnl >= 0 ? "+" : ""}
                      {formatRp(data.paperTrading.totalPnl)} ({formatPercent(data.paperTrading.totalPnlPct)})
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {data.paperTrading.positionCount} posisi terbuka
                  </p>
                  <Link href="/dashboard/bottom-fishing" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                    Trading <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Belum punya akun simulasi trading?
                </p>
                <Link
                  href="/dashboard/bottom-fishing"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Mulai Paper Trading
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reputation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" />
              Reputasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Skor Reputasi</p>
                  <p className="text-3xl font-bold">{data?.reputation.score ?? 0}</p>
                </div>
                {data?.reputation && (() => {
                  const styles = BADGE_STYLES[data.reputation.badgeColor] ?? BADGE_STYLES.slate;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${styles.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${styles.dot}`} aria-hidden="true" />
                      {data.reputation.badge}
                    </span>
                  );
                })()}
                <div>
                  <Link href="/community" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                    Lihat komunitas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Watchlist Movers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-accent" />
              Watchlist Movers
            </span>
            <Link href="/watchlist" className="text-xs text-accent hover:underline font-normal inline-flex items-center gap-1">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data?.watchlistMovers && data.watchlistMovers.length > 0 ? (
            <div className="divide-y divide-border">
              {data.watchlistMovers.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stocks/${stripJk(stock.ticker)}`}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold">{stripJk(stock.ticker)}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{stock.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    {stock.changePercent !== null && stock.changePercent >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-bullish" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-bearish" />
                    )}
                    <span className={`text-sm font-semibold ${changeColor(stock.changePercent)}`}>
                      {stock.changePercent !== null
                        ? `${stock.changePercent >= 0 ? "+" : ""}${formatPercent(stock.changePercent)}`
                        : "-"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Belum ada saham di watchlist
              </p>
              <Link
                href="/watchlist"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                <Plus className="h-4 w-4" />
                Tambah Saham
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Community Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" />
            Diskusi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.recentPosts && data.recentPosts.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community?post=${post.id}`}
                  className="block py-3 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {post.author.username ?? post.author.name ?? "Anonim"}
                        {post.tickerTag && (
                          <span className="ml-1.5 text-accent font-medium">${stripJk(post.tickerTag)}</span>
                        )}
                      </p>
                      <p className="text-sm line-clamp-2 mt-0.5">{post.content}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada diskusi baru dalam 24 jam terakhir.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Feature Tool Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Analysis Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((f) => (
            <Link key={f.href} href={f.href}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <f.icon className="h-4 w-4 text-accent" />
                    {f.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
