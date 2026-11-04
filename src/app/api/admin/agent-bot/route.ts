import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/**
 * Admin Agent-Bot monitoring (owner 4 Nov: "masukan ke dashboard untuk saya sendiri").
 * Wave-1: zero instrumentasi — SQL murni dari schema `agent` (TeknikalAgent live).
 * Read-only, WIB-aware (created_at UTC -> Asia/Jakarta).
 */
export async function GET() {
  try {
    await requireAdmin();

    const [healthRow] = await prisma.$queryRaw<Array<{ jobsToday: bigint; fail7: bigint; done7: bigint; fb7: bigint; out7: bigint }>>`
      SELECT
        (SELECT count(*) FROM agent.agent_job WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = (now() AT TIME ZONE 'Asia/Jakarta')::date) AS "jobsToday",
        (SELECT count(*) FROM agent.agent_job WHERE status='failed' AND created_at >= now() - interval '7 days') AS "fail7",
        (SELECT count(*) FROM agent.agent_job WHERE status='done' AND created_at >= now() - interval '7 days') AS "done7",
        (SELECT count(*) FROM agent.agent_message_log WHERE dir='out' AND content_redacted ILIKE '%data tidak mencukupi%' AND created_at >= now() - interval '7 days') AS "fb7",
        (SELECT count(*) FROM agent.agent_message_log WHERE dir='out' AND created_at >= now() - interval '7 days') AS "out7"
    `;

    const latencyRows = await prisma.$queryRaw<Array<{ p50: number | null; p90: number | null }>>`
      SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
             percentile_disc(0.9) WITHIN GROUP (ORDER BY latency_ms) AS p90
      FROM agent.agent_message_log
      WHERE dir='out' AND created_at >= now() - interval '7 days'
    `;

    const queueRows = await prisma.$queryRaw<Array<{ status: string; n: bigint }>>`
      SELECT status, count(*) AS n FROM agent.agent_job
      WHERE status IN ('pending','running') GROUP BY 1
    `;

        // Label model LLM agent (owner 5 Nov "model apa yang dipakai") — dari env var
    // AGENTD_LLM_MODEL yang juga dipakai agentd; fallback generic.
    const MODEL_LABEL = process.env.AGENTBOT_LLM_MODEL || "glm-5.3-flash";

    const users = await prisma.$queryRaw<Array<{
      chatId: string; tier: string | null; subStatus: string | null; periodEnd: Date | null;
      turnsMonth: string | null; lastActive: Date | null; onbDone: boolean | null;
    }>>`
      SELECT u.chat_id AS "chatId",
             s.tier, s.status AS "subStatus", s.period_end AS "periodEnd",
             (SELECT sum(l.turns_used)::text FROM agent.agent_usage_ledger l
               WHERE l.chat_id = u.chat_id AND l.month = to_char(now(), 'YYYY-MM')) AS "turnsMonth",
             u.last_active_at AS "lastActive",
             p.onb_done AS "onbDone"
      FROM agent.agent_user u
      LEFT JOIN agent.agent_subscription s ON s.chat_id = u.chat_id AND s.status = 'active'
      LEFT JOIN agent.agent_profile p ON p.chat_id = u.chat_id
      ORDER BY u.last_active_at DESC NULLS LAST
      LIMIT 30
    `;

    // FIX 4 Nov: agent_message_log hanya punya kolom `tokens` (total in+out) —
    // tokens_in/tokens_out menyebabkan 42703 → seluruh tab kosong. Split pakai ledger.
    const econ = await prisma.$queryRaw<Array<{ din: string | null; dout: string | null }>>`
      SELECT coalesce(sum(l.tokens_in),0)::text AS din, coalesce(sum(l.tokens_out),0)::text AS dout
      FROM agent.agent_usage_ledger l
      WHERE l.created_at >= now() - interval '7 days'
    `;

    const feat = await prisma.$queryRaw<Array<{ feature: string; used: string; tokens: string }>>`
      SELECT feature, coalesce(sum(feature_count),0)::text AS used, coalesce(sum(tokens_in + tokens_out),0)::text AS tokens
      FROM agent.agent_usage_ledger
      WHERE created_at >= now() - interval '7 days'
      GROUP BY 1 ORDER BY 3::bigint DESC LIMIT 8
    `;

    // Per-user token & turn breakdown (owner 5 Nov): window 7/30/90 hari dalam SATU query.
    const perUser = await prisma.$queryRaw<Array<{
      chatId: string; tier: string | null;
      t7: string; t30: string; t90: string; turns30: string;
      in7: string; out7: string; lastActive: Date | null;
    }>>`
      SELECT u.chat_id::text AS "chatId", coalesce(s.tier,'free') AS tier,
        coalesce((SELECT sum(l.tokens_in+l.tokens_out) FROM agent.agent_usage_ledger l
          WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '7 days'),0)::text AS t7,
        coalesce((SELECT sum(l.tokens_in+l.tokens_out) FROM agent.agent_usage_ledger l
          WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '30 days'),0)::text AS t30,
        coalesce((SELECT sum(l.tokens_in+l.tokens_out) FROM agent.agent_usage_ledger l
          WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '90 days'),0)::text AS t90,
        coalesce((SELECT sum(l.turns_used) FROM agent.agent_usage_ledger l
          WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '30 days'),0)::text AS "turns30",
        coalesce((SELECT sum(l.tokens_in) FROM agent.agent_usage_ledger l
          WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '7 days'),0)::text AS in7,
        coalesce((SELECT sum(l.tokens_out) FROM agent.agent_usage_ledger l
          WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '7 days'),0)::text AS out7,
        u.last_active_at AS "lastActive"
      FROM agent.agent_user u
      LEFT JOIN agent.agent_subscription s ON s.chat_id=u.chat_id AND s.status='active'
      ORDER BY (SELECT coalesce(sum(l.tokens_in+l.tokens_out),0) FROM agent.agent_usage_ledger l
        WHERE l.chat_id=u.chat_id AND l.created_at >= now() - interval '7 days') DESC NULLS LAST
      LIMIT 20
    `;

    // Daily series 14 hari (compare daily/weekly — owner 5 Nov): token per hari WIB.
    const dailyTokens = await prisma.$queryRaw<Array<{ d: string; tin: string; tout: string; turns: string }>>`
      SELECT to_char((l.created_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS d,
             coalesce(sum(l.tokens_in),0)::text AS tin,
             coalesce(sum(l.tokens_out),0)::text AS tout,
             coalesce(sum(l.turns_used),0)::text AS turns
      FROM agent.agent_usage_ledger l
      WHERE l.created_at >= now() - interval '14 days'
      GROUP BY 1 ORDER BY 1
    `;

    const tickers = await prisma.$queryRaw<Array<{ t: string | null; n: bigint }>>`
      SELECT payload->>'text' AS t, count(*) AS n FROM agent.agent_job
      WHERE kind='chat' AND created_at >= now() - interval '14 days' AND payload->>'text' IS NOT NULL
      GROUP BY 1
    `;
    // Hitung ticker populer di aplikasi (regex per ticker IDX top-20 + semua kata 4-huruf uppercase)
    const tickCount = new Map<string, number>();
    for (const row of tickers) {
      const words = (row.t ?? "").toUpperCase().match(/\b[A-Z]{4}\b/g) ?? [];
      for (const w of words) tickCount.set(w, (tickCount.get(w) ?? 0) + 1);
    }
    const topTickers = [...tickCount.entries()]
      .filter(([t]) => !["GIMANA", "SAMA", "BISA", "KAPAN", "BANK", "SAHAM", "IHSG", "DENGAN", "YANGN"].includes(t))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ticker, n]) => ({ ticker, n: Number(n) }));

    const jobs14 = await prisma.$queryRaw<Array<{ d: Date; n: bigint }>>`
      SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d, count(*) AS n
      FROM agent.agent_job
      WHERE created_at >= now() - interval '14 days'
      GROUP BY 1 ORDER BY 1
    `;

    const [funnelRow] = await prisma.$queryRaw<Array<{ total: bigint; onb: bigint; act7: bigint; paid: bigint }>>`
      SELECT
        (SELECT count(*) FROM agent.agent_user) AS total,
        (SELECT count(*) FROM agent.agent_profile WHERE onb_done = true) AS onb,
        (SELECT count(DISTINCT chat_id) FROM agent.agent_message_log WHERE created_at >= now() - interval '7 days') AS act7,
        (SELECT count(*) FROM agent.agent_subscription WHERE status='active' AND tier <> 'free') AS paid
    `;

    // Wave-2 (bo-2026-11-04-03): feedback 👍/👎 14d + tool-audit per-tool 7d.
    const feedbackRows = await prisma.$queryRaw<Array<{ d: Date; up: bigint; dn: bigint }>>`
      SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d,
             count(*) FILTER (WHERE rating='up') AS up,
             count(*) FILTER (WHERE rating='down') AS dn
      FROM agent.agent_feedback
      WHERE created_at >= now() - interval '14 days'
      GROUP BY 1 ORDER BY 1
    `;
    const toolRows = await prisma.$queryRaw<Array<{ tool: string; n: bigint; errs: bigint; p50: number | null; p90: number | null }>>`
      SELECT tool, count(*) AS n,
             count(*) FILTER (WHERE ok = false) AS errs,
             percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
             percentile_disc(0.9) WITHIN GROUP (ORDER BY latency_ms) AS p90
      FROM agent.agent_tool_audit
      WHERE created_at >= now() - interval '7 days'
      GROUP BY 1 ORDER BY n DESC LIMIT 12
    `;

    const done7 = Number(healthRow?.done7 ?? 0);
    const fail7 = Number(healthRow?.fail7 ?? 0);
    const out7 = Number(healthRow?.out7 ?? 0);
    const fb7 = Number(healthRow?.fb7 ?? 0);
    const din = Number(econ[0]?.din ?? 0);
    const dout = Number(econ[0]?.dout ?? 0);

    // Guard global: bigint apapun yang lolos dikonversi, bukan crash 500.
    const jsonReplacer = (_k: string, v: unknown) => (typeof v === "bigint" ? Number(v) : v);
    return NextResponse.json(JSON.parse(JSON.stringify({ data: {
        health: {
          jobsToday: Number(healthRow?.jobsToday ?? 0),
          successRate: done7 + fail7 > 0 ? Math.round((done7 / (done7 + fail7)) * 1000) / 10 : 100,
          fallbackRate: out7 > 0 ? Math.round((fb7 / out7) * 1000) / 10 : 0,
          fb7, out7, done7, fail7,
          // FIX 5 Nov: percentile_disc balik BigInt — Number() wajib, kalau tidak JSON.stringify
          // TypeError "Do not know how to serialize a BigInt" → endpoint 500 → tab kosong.
          p50: latencyRows[0]?.p50 != null ? Number(latencyRows[0].p50) : null,
          p90: latencyRows[0]?.p90 != null ? Number(latencyRows[0].p90) : null,
          queue: queueRows.map((r) => ({ status: r.status, n: Number(r.n) })),
        },
        // FIX 5 Nov r3: chat_id BIGINT (int8) balik sebagai BigInt Prisma → JSON.stringify crash.
        // Spread ...a tidak boleh dipakai untuk row raw-SQL — map eksplisit SEMUA kolom.
        users: users.map((u) => ({
          chatId: String(u.chatId),
          tier: u.tier,
          subStatus: u.subStatus,
          periodEnd: u.periodEnd,
          turnsMonth: u.turnsMonth ? Number(u.turnsMonth) : 0,
          lastActive: u.lastActive,
          onbDone: u.onbDone,
        })),
        econ: { tokensIn: din, tokensOut: dout, estRp: Math.round((din / 1000) * 1.1 + (dout / 1000) * 4.4) },
        model: MODEL_LABEL,
        perUser: perUser.map((u) => ({
          chatId: String(u.chatId), tier: u.tier,
          t7: Number(u.t7), t30: Number(u.t30), t90: Number(u.t90),
          turns30: Number(u.turns30), in7: Number(u.in7), out7: Number(u.out7),
          lastActive: u.lastActive,
        })),
        dailyTokens: dailyTokens.map((d) => ({
          d: d.d, tin: Number(d.tin), tout: Number(d.tout), turns: Number(d.turns),
        })),
        features: feat.map((f) => ({ feature: f.feature, used: Number(f.used), tokens: Number(f.tokens) })),
        topTickers,
        jobs14: jobs14.map((j) => ({ d: j.d, n: Number(j.n) })),
        funnel: {
          total: Number(funnelRow?.total ?? 0),
          onb: Number(funnelRow?.onb ?? 0),
          act7: Number(funnelRow?.act7 ?? 0),
          paid: Number(funnelRow?.paid ?? 0),
        },
        feedback: feedbackRows.map((f) => ({ d: f.d, up: Number(f.up), dn: Number(f.dn) })),
        tools: toolRows.map((t) => ({
          tool: t.tool, n: Number(t.n), errs: Number(t.errs),
          p50: t.p50 != null ? Number(t.p50) : null, p90: t.p90 != null ? Number(t.p90) : null,
        })),
      },
    }, jsonReplacer)));
  } catch (error) {
    return handleApiError(error, "fetch agent bot stats");
  }
}
