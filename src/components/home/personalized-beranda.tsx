"use client";

import Link from "next/link";
import { useDashboardSummary, useClaimDailyReward } from "@/hooks/use-dashboard-summary";
import { usePortfolio } from "@/hooks/use-portfolio";
import {
  Bookmark,
  TrendingUp,
  TrendingDown,
  Wallet,
  Award,
  MessageSquare,
  ArrowRight,
  Plus,
  Flame,
  Gift,
  CheckCircle2,
  Briefcase,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { formatRp, formatPercent, changeColor, stripJk } from "@/lib/utils";

// Reputation badge tints (light). Hues retained for tier distinction; all on
// translucent light fills readable on the paper card.
const BADGE_STYLES: Record<string, { bg: string; dot: string }> = {
  amber: { bg: "bg-amber-500/10 text-amber-700 border border-amber-500/20", dot: "bg-amber-500" },
  purple: { bg: "bg-purple-500/10 text-purple-700 border border-purple-500/20", dot: "bg-purple-500" },
  gold: { bg: "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20", dot: "bg-yellow-500" },
  teal: { bg: "bg-teal-500/10 text-teal-700 border border-teal-500/20", dot: "bg-teal-500" },
  blue: { bg: "bg-accent-muted text-accent border border-accent/20", dot: "bg-accent" },
  indigo: { bg: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20", dot: "bg-indigo-500" },
  cyan: { bg: "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20", dot: "bg-cyan-500" },
  slate: { bg: "bg-bg-hover text-text-secondary border border-border", dot: "bg-text-tertiary" },
};

// Card wrapper — light broadsheet surface (was dark #0f172a terminal).
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-hover rounded-md ${className ?? ""}`} />;
}

// Technical signal styles — collapsed onto the system palette:
// bull-teal / neutral-slate / bear-red (was a 5-step emerald→red rainbow).
const SIGNAL_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  STRONG_BUY: { bg: "bg-bullish-bg border-bullish/30", text: "text-bullish", label: "Bullish", dot: "bg-bullish" },
  BUY: { bg: "bg-bullish-bg border-bullish/30", text: "text-bullish", label: "Bullish", dot: "bg-bullish" },
  HOLD: { bg: "bg-bg-hover border-border", text: "text-text-secondary", label: "Netral", dot: "bg-text-tertiary" },
  SELL: { bg: "bg-bearish-bg border-bearish/30", text: "text-bearish", label: "Bearish", dot: "bg-bearish" },
  STRONG_SELL: { bg: "bg-bearish-bg border-bearish/30", text: "text-bearish", label: "Bearish", dot: "bg-bearish" },
};

const SIGNAL_OVERALL: Record<string, { icon: string; color: string; label: string }> = {
  STRONG_BUY: { icon: "▲", color: "text-bullish", label: "Bullish" },
  BUY: { icon: "▲", color: "text-bullish", label: "Bullish" },
  HOLD: { icon: "●", color: "text-text-tertiary", label: "Netral" },
  SELL: { icon: "▼", color: "text-bearish", label: "Bearish" },
  STRONG_SELL: { icon: "▼", color: "text-bearish", label: "Bearish" },
};

export function PersonalizedBeranda() {
  const { data, isLoading } = useDashboardSummary();
  const claimReward = useClaimDailyReward();
  const { data: portfolio } = usePortfolio();

  const pnlPositive = data?.paperTrading ? data.paperTrading.totalPnl >= 0 : true;

  return (
    <div className="space-y-4">
      {/* Bento Grid — trading-critical cards up top, social/rewards demoted */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ── Real Portfolio + Advice Card (spans 2 cols) ── */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">Portofolio Saya</h3>
              {portfolio?.adviceSummary && (() => {
                const adv = SIGNAL_OVERALL[portfolio.adviceSummary.overallAction] ?? SIGNAL_OVERALL.HOLD;
                return (
                  <span className={`text-[10px] font-bold ${adv.color}`}>
                    {adv.icon} {adv.label}
                  </span>
                );
              })()}
            </div>
            <Link href="/portfolio" className="text-[10px] text-accent hover:underline font-mono inline-flex items-center gap-1 py-2 px-1 -my-2">
              Detail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {portfolio && portfolio.holdings.length > 0 ? (
            <div className="space-y-3">
              {/* P&L Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pb-3 border-b border-border">
                <div>
                  <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Nilai Total</p>
                  <p className="text-base sm:text-lg font-bold text-text-primary font-mono tabular-nums">
                    {formatRp(portfolio.summary.totalValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Total P&L</p>
                  <div className="flex items-center gap-1">
                    {portfolio.summary.totalPnl >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-bullish shrink-0" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-bearish shrink-0" />
                    )}
                    <span className={`text-base sm:text-lg font-bold font-mono tabular-nums ${changeColor(portfolio.summary.totalPnl)}`}>
                      {formatRp(portfolio.summary.totalPnl)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono tabular-nums ${changeColor(portfolio.summary.totalPnlPercent)}`}>
                    ({formatPercent(portfolio.summary.totalPnlPercent)})
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Sinyal Teknikal</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-bullish font-mono">▲ {portfolio.adviceSummary.bullishCount}</span>
                    <span className="text-xs text-text-tertiary font-mono">● {portfolio.adviceSummary.neutralCount}</span>
                    <span className="text-xs text-bearish font-mono">▼ {portfolio.adviceSummary.bearishCount}</span>
                  </div>
                </div>
              </div>

              {/* Holdings with Technical Signals */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {portfolio.holdings
                  .sort((a, b) => b.advice.score - a.advice.score)
                  .map((holding) => {
                    const sigStyle = SIGNAL_STYLES[holding.advice.action] ?? SIGNAL_STYLES.HOLD;
                    return (
                      <Link
                        key={holding.ticker}
                        href={`/stocks/${stripJk(holding.ticker)}`}
                        className="flex items-center gap-2 sm:gap-3 py-2 px-2 rounded-lg hover:bg-bg-hover transition-colors group"
                      >
                        {/* Signal dot */}
                        <span className={`shrink-0 w-1 h-8 rounded-full ${sigStyle.dot}`} />

                        {/* Ticker + Signal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-text-primary">{stripJk(holding.ticker)}</span>
                            {holding.isGorengan && (
                              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sigStyle.bg} ${sigStyle.text}`}>
                              {sigStyle.label}
                            </span>
                            {holding.advice.reasons.length > 0 && (
                              <p className="text-[10px] text-text-tertiary truncate">
                                {holding.advice.reasons[0]}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* P&L */}
                        <div className="text-right shrink-0">
                          <span className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${changeColor(holding.pnl)}`}>
                            {holding.pnl !== null ? formatRp(holding.pnl) : "-"}
                          </span>
                          <p className={`text-[10px] font-mono tabular-nums ${changeColor(holding.pnlPercent)}`}>
                            {holding.pnlPercent !== null ? formatPercent(holding.pnlPercent) : "-"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
              </div>

              {/* Disclaimer */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                <Shield className="h-3 w-3 text-text-tertiary shrink-0" />
                <p className="text-[9px] text-text-tertiary">
                  Sinyal teknikal berdasarkan indikator RSI, MACD, moving average. Bukan rekomendasi beli/jual.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-text-secondary mb-3">Belum ada saham di portofolio</p>
              <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                <Plus className="h-4 w-4" />
                Tambah Holding
              </Link>
            </div>
          )}
        </Card>

        {/* ── Watchlist Movers Card (spans 2 cols) ── */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">Watchlist Movers</h3>
            </div>
            <Link href="/watchlist" className="text-[10px] text-accent hover:underline font-mono inline-flex items-center gap-1 py-2 -my-2">
              Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : data?.watchlistMovers && data.watchlistMovers.length > 0 ? (
            <div className="divide-y divide-border">
              {data.watchlistMovers.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stocks/${stripJk(stock.ticker)}`}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:bg-bg-hover -mx-3 px-3 transition-colors"
                >
                  <div>
                    <span className="text-sm font-semibold text-text-primary">{stripJk(stock.ticker)}</span>
                    <p className="text-[10px] text-text-tertiary truncate max-w-[160px]">{stock.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {stock.changePercent !== null && stock.changePercent >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-bullish" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-bearish" />
                    )}
                    <span className={`text-sm font-bold font-mono tabular-nums ${changeColor(stock.changePercent)}`}>
                      {stock.changePercent !== null ? formatPercent(stock.changePercent) : "-"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-text-tertiary mb-3">Belum ada saham di watchlist</p>
              <Link href="/watchlist" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                <Plus className="h-4 w-4" />
                Tambah Saham
              </Link>
            </div>
          )}
        </Card>

        {/* ── Paper Trading Card (spans 2 cols) ── */}
        <Card className={`md:col-span-2 ${data?.paperTrading && data.paperTrading.totalPnl !== 0 ? (pnlPositive ? "glow-bullish" : "glow-bearish") : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">Paper Trading</h3>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : data?.paperTrading ? (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Saldo</p>
                <p className="text-2xl font-bold text-text-primary font-mono tabular-nums">{formatRp(data.paperTrading.balance)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">Total Nilai</p>
                  <p className="text-sm font-medium text-text-secondary font-mono tabular-nums">{formatRp(data.paperTrading.totalValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">P&L</p>
                  <div className="flex items-center gap-1.5">
                    {data.paperTrading.totalPnl >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-bullish" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-bearish" />
                    )}
                    <span className={`text-sm font-bold font-mono tabular-nums ${changeColor(data.paperTrading.totalPnl)}`}>
                      {formatRp(data.paperTrading.totalPnl)} ({formatPercent(data.paperTrading.totalPnlPct)})
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-text-tertiary font-mono">{data.paperTrading.positionCount} posisi terbuka</span>
                <Link href="/paper-trading" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                  Trading <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-text-secondary mb-3">Belum punya akun simulasi trading?</p>
              <Link href="/paper-trading" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                <Plus className="h-4 w-4" />
                Mulai Paper Trading
              </Link>
            </div>
          )}
        </Card>

        {/* ── Quick Tools (spans 2 cols) ── */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Quick Tools</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Link href="/bottom-fishing" className="px-3 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-medium bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all press-scale">
              Bottom Fishing Radar
            </Link>
            <Link href="/market-structure" className="px-3 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-medium bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all press-scale">
              Market Structure
            </Link>
            <Link href="/trading-plan" className="px-3 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-medium bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all press-scale">
              Trading Plan
            </Link>
            <Link href="/screener" className="px-3 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-medium bg-bg-hover border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all press-scale">
              Screener
            </Link>
          </div>
        </Card>

        {/* ── Community Feed Card (spans 2 cols) ── */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">Diskusi Terbaru</h3>
            </div>
            <Link href="/community" className="text-[10px] text-accent hover:underline font-mono inline-flex items-center gap-1 py-2 -my-2">
              Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : data?.recentPosts && data.recentPosts.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community?post=${post.id}`}
                  className="block py-3 first:pt-0 last:pb-0 hover:bg-bg-hover -mx-3 px-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-text-tertiary">
                      {post.author.username ?? post.author.name ?? "Anonim"}
                      {post.tickerTag && (
                        <span className="ml-1.5 text-accent font-semibold font-mono">{stripJk(post.tickerTag)}</span>
                      )}
                    </p>
                    <p className="text-sm text-text-secondary line-clamp-2 mt-0.5">{post.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary text-center py-4">
              Belum ada diskusi baru dalam 24 jam terakhir.
            </p>
          )}
        </Card>

        {/* ── Reputation Card ── */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">Reputasi</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-3xl font-bold text-text-primary font-mono tabular-nums">{data?.reputation.score ?? 0}</p>
              {data?.reputation && (() => {
                const styles = BADGE_STYLES[data.reputation.badgeColor] ?? BADGE_STYLES.slate;
                return (
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
                    {data.reputation.badge}
                  </span>
                );
              })()}
              {data?.dailyReward && data.dailyReward.streak > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                  <Flame className="h-3 w-3 text-amber-500" />
                  {data.dailyReward.streak} hari streak
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Daily Reward Card ── */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">Daily Reward</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : data?.dailyReward?.canClaim ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">+1 poin tersedia hari ini</p>
              <button
                onClick={() => claimReward.mutate()}
                disabled={claimReward.isPending}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-bullish-bg text-bullish border border-bullish/30 hover:bg-bullish/20 transition-all press-scale disabled:opacity-50 cursor-pointer"
              >
                {claimReward.isPending ? "Mengklaim..." : "Klaim Sekarang"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckCircle2 className="h-4 w-4 text-bullish" />
                Sudah diklaim
              </div>
              {data?.dailyReward && data.dailyReward.streak > 0 && (
                <p className="text-[10px] text-text-tertiary font-mono">{data.dailyReward.streak} hari berturut-turut</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
