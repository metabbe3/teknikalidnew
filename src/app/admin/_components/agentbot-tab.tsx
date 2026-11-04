"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Bot, Activity, Timer, Wallet, Users2, Filter } from "lucide-react";
import { formatVolume } from "@/lib/utils";

interface AgentBotData {
  health: {
    jobsToday: number;
    successRate: number;
    fallbackRate: number;
    fb7: number;
    out7: number;
    done7: number;
    fail7: number;
    p50: number | null;
    p90: number | null;
    queue: { status: string; n: number }[];
  };
  users: Array<{
    chatId: string;
    tier: string | null;
    subStatus: string | null;
    periodEnd: string | null;
    turnsMonth: number;
    lastActive: string | null;
    onbDone: boolean | null;
  }>;
  econ: { tokensIn: number; tokensOut: number; estRp: number };
  features: Array<{ feature: string; used: number; tokens: number }>;
  topTickers: Array<{ ticker: string; n: number }>;
  jobs14: Array<{ d: string; n: number }>;
  funnel: { total: number; onb: number; act7: number; paid: number };
}

function fmtRp(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

export function AgentBotTab() {
  const { data, isLoading } = useQuery<AgentBotData>({
    queryKey: ["admin-agent-bot"],
    queryFn: async () => {
      const r = await fetch("/api/admin/agent-bot");
      if (!r.ok) return undefined;
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const h = data?.health;
  const queueTxt = h?.queue.length ? h.queue.map((q) => `${q.status}:${q.n}`).join(", ") : "kosong";
  const succOk = (h?.successRate ?? 100) >= 95;
  const fbOk = (h?.fallbackRate ?? 0) <= 3;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminKpiCard title="Job Hari Ini" icon={Bot} value={formatVolume(h?.jobsToday ?? 0)} subtitle={`queue: ${queueTxt}`} gradient="blue" />
        <AdminKpiCard
          title="Success Rate 7d"
          icon={Activity}
          value={`${h?.successRate ?? 100}%`}
          subtitle={`${h?.done7 ?? 0} done · ${h?.fail7 ?? 0} failed`}
          gradient={succOk ? "emerald" : "rose"}
        />
        <AdminKpiCard
          title="Fallback Rate 7d"
          icon={Filter}
          value={`${h?.fallbackRate ?? 0}%`}
          subtitle={`${h?.fb7 ?? 0}/${h?.out7 ?? 0} "data tidak cukup"`}
          gradient={fbOk ? "emerald" : "amber"}
        />
        <AdminKpiCard title="Latency p50/p90" icon={Timer} value={`${h?.p50 ?? "-"}ms`} subtitle={`p90 ${h?.p90 ?? "-"}ms`} gradient="blue" />
        <AdminKpiCard title="User Aktif 7d" icon={Users2} value={formatVolume(data?.funnel.act7 ?? 0)} subtitle={`${data?.funnel.total ?? 0} terdaftar`} gradient="amber" />
        <AdminKpiCard title="Est. Biaya LLM 7d" icon={Wallet} value={fmtRp(data?.econ.estRp ?? 0)} subtitle={`${formatVolume(data?.econ.tokensIn ?? 0)} in · ${formatVolume(data?.econ.tokensOut ?? 0)} out tok`} gradient="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">👥 Bot Users &amp; Kuota</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminDataTable
              loading={isLoading}
              columns={[
                { header: "Chat ID", cell: (u) => (u.chatId.length > 12 ? u.chatId.slice(0, 12) + "…" : u.chatId) },
                { header: "Tier", cell: (u) => (u.tier ?? "free") },
                { header: "Status", cell: (u) => (u.subStatus ?? "-") },
                { header: "Turn bulan ini", cell: (u) => String(u.turnsMonth ?? 0) },
                {
                  header: "Last Active",
                  cell: (u) =>
                    u.lastActive
                      ? new Date(u.lastActive).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "-",
                },
                { header: "Onb", cell: (u) => (u.onbDone ? "✓" : "–") },
              ]}
              data={data?.users}
              keyFn={(u) => u.chatId}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🔬 Funnel Agent</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex flex-wrap items-center gap-1">
                <b>{data?.funnel.total ?? 0}</b> user → <b>{data?.funnel.onb ?? 0}</b> onb → <b>{data?.funnel.act7 ?? 0}</b> aktif 7d → <b>{data?.funnel.paid ?? 0}</b> paid
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">📈 Ticker Paling Ditanya (14d)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {(data?.topTickers ?? []).length === 0 ? (
                <span className="text-muted-foreground">Belum ada</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data?.topTickers.map((t) => (
                    <span key={t.ticker} className="rounded bg-muted px-2 py-0.5">
                      <b>{t.ticker}</b> ×{t.n}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💸 Token per Fitur (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminDataTable
                loading={isLoading}
                columns={[
                  { header: "Fitur", cell: (f) => f.feature },
                  { header: "Pemakaian", cell: (f) => formatVolume(f.used) },
                  { header: "Tokens", cell: (f) => formatVolume(f.tokens) },
                ]}
                data={data?.features}
                keyFn={(f) => f.feature}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">🗓️ Job per Hari (14d)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex flex-wrap gap-2">
            {data?.jobs14.map((j) => (
              <span key={j.d} className="rounded bg-muted px-2 py-0.5" title={j.d}>
                {j.n}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
