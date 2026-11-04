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
  feedback: { d: string; up: number; dn: number }[];
  tools: { tool: string; n: number; errs: number; p50: number | null; p90: number | null }[];
  model?: string;
  perUser?: Array<{ chatId: string; tier: string | null; t7: number; t30: number; t90: number; turns30: number; in7: number; out7: number; lastActive: string | null }>;
  dailyTokens?: Array<{ d: string; tin: number; tout: number; turns: number }>;
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
      const j = await r.json();
      // API membalik {data: AgentBotData} — unwrap agar komponen menerima shape yang benar.
      return j?.data ?? j;
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
                  {(data?.topTickers ?? []).map((t) => (
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
          <CardTitle className="text-sm">🧾 Token per User (7/30/90 hari){data?.model ? ` · ${data.model}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {(data?.perUser ?? []).length === 0 ? (
            <span className="text-muted-foreground">Belum ada data</span>
          ) : (
            <AdminDataTable
              columns={[
                { header: "CHAT ID", cell: (u) => <span className="font-mono">{u.chatId}</span> },
                { header: "TIER", cell: (u) => u.tier || "free" },
                { header: "7D TOK", cell: (u) => formatVolume(u.t7) },
                { header: "30D TOK", cell: (u) => formatVolume(u.t30) },
                { header: "90D TOK", cell: (u) => formatVolume(u.t90) },
                { header: "TURN 30D", cell: (u) => u.turns30 },
                { header: "IN/OUT 7D", cell: (u) => `${formatVolume(u.in7)} / ${formatVolume(u.out7)}` },
              ]}
              data={data?.perUser ?? []}
              keyFn={(u) => u.chatId}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📅 Token per Hari (14d)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {(data?.dailyTokens ?? []).length === 0 ? (
            <span className="text-muted-foreground">Belum ada data</span>
          ) : (
            <AdminDataTable
              columns={[
                { header: "TANGGAL", cell: (d) => d.d },
                { header: "IN", cell: (d) => formatVolume(d.tin) },
                { header: "OUT", cell: (d) => formatVolume(d.tout) },
                { header: "TOTAL", cell: (d) => <b>{formatVolume(d.tin + d.tout)}</b> },
                { header: "TURN", cell: (d) => d.turns },
              ]}
              data={data?.dailyTokens ?? []}
              keyFn={(d) => d.d}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">👍👎 Feedback Jawaban (14d)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {(data?.feedback ?? []).length === 0 ? (
              <span className="text-muted-foreground">Belum ada feedback</span>
            ) : (
              <AdminDataTable
                loading={isLoading}
                columns={[
                  { header: "Tanggal", cell: (f) => new Date(f.d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) },
                  { header: "👍", cell: (f) => <span className="text-emerald-600">{f.up}</span> },
                  { header: "👎", cell: (f) => <span className="text-rose-600">{f.dn}</span> },
                ]}
                data={data?.feedback}
                keyFn={(f) => f.d}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔧 Tool Latency &amp; Error (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.tools ?? []).length === 0 ? (
              <span className="text-muted-foreground text-sm">Belum ada pemanggilan tool</span>
            ) : (
              <AdminDataTable
                loading={isLoading}
                columns={[
                  { header: "Tool", cell: (t) => t.tool },
                  { header: "Calls", cell: (t) => String(t.n) },
                  { header: "Error", cell: (t) => (t.errs > 0 ? <span className="text-rose-600">{t.errs}</span> : "0") },
                  { header: "p50/p90", cell: (t) => `${t.p50 ?? "-"}ms / ${t.p90 ?? "-"}ms` },
                ]}
                data={data?.tools}
                keyFn={(t) => t.tool}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">🗓️ Job per Hari (14d)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex flex-wrap gap-2">
            {(data?.jobs14 ?? []).map((j) => (
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
