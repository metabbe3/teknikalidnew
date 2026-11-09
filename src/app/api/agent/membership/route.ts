import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// AGENT membership check (owner 5 Nov, extended 10 Nov untuk Free Trial 7 Hari):
// endpoint yang dipakai halaman web agent utk cek status langganan + binding Telegram + trial milik email session.
// GET /api/agent/membership → { tier, status, periodEnd, turnsUsed, maxTurns, chatBound, promoUsed, trialUsed, trialCreatedAt, trialDaysLeft }
export async function GET() {
  try {
    const session = await requireAuth();
    const emailLower = String(session.email ?? "").toLowerCase().trim();

    const bindRows = await prisma.$queryRawUnsafe<Array<{ chat_id: string }>>(
      `SELECT chat_id::text FROM agent.agent_web_binding WHERE lower(email) = $1 LIMIT 1`,
      emailLower
    );
    const rawChatId = bindRows.length > 0 ? bindRows[0].chat_id : null;
    const chatIdNum = rawChatId !== null ? Number.parseInt(String(rawChatId), 10) : Number.NaN;
    const chatBound =
      Number.isSafeInteger(chatIdNum) && !Number.isNaN(chatIdNum) && chatIdNum !== 0;
    const chatId = chatBound ? String(chatIdNum) : null;

    let tier = "free";
    let status: string | null = null;
    let periodEnd: string | null = null;
    let turnsUsed = 0;
    let maxTurns = 90;
    let promoUsed = false;
    let trialUsed = false;
    let trialCreatedAt: string | null = null;

    // Cek status trial via agent.agent_ops_config (tanpa migrasi skema)
    const emailTrialKey = `trial_used_${emailLower}`;
    const trialConfigRows = await prisma.$queryRawUnsafe<
      Array<{ key: string; value: string; updated_at: Date }>
    >(
      chatBound
        ? `SELECT key, value, updated_at FROM agent.agent_ops_config WHERE key IN ($1, $2) ORDER BY updated_at ASC LIMIT 1`
        : `SELECT key, value, updated_at FROM agent.agent_ops_config WHERE key = $1 LIMIT 1`,
      ...(chatBound ? [emailTrialKey, `trial_chat_${chatIdNum}`] : [emailTrialKey])
    );

    if (trialConfigRows.length > 0) {
      trialUsed = true;
      try {
        const parsed = JSON.parse(trialConfigRows[0].value) as { createdAt?: string };
        trialCreatedAt =
          parsed.createdAt ?? trialConfigRows[0].updated_at.toISOString();
      } catch {
        trialCreatedAt = trialConfigRows[0].updated_at.toISOString();
      }
    }

    if (chatBound) {
      const subRows = await prisma.$queryRawUnsafe<
        Array<{
          tier: string;
          status: string;
          period_end: Date | null;
          order_id: string | null;
          created_at: Date;
        }>
      >(
        `SELECT tier, status, period_end, order_id, created_at FROM agent.agent_subscription WHERE chat_id = $1 LIMIT 1`,
        chatIdNum
      );
      if (subRows.length) {
        tier = subRows[0].tier;
        status = subRows[0].status;
        periodEnd = subRows[0].period_end ? subRows[0].period_end.toISOString() : null;
        if (subRows[0].order_id?.startsWith("TRIAL7-")) {
          trialUsed = true;
          if (!trialCreatedAt) {
            trialCreatedAt = subRows[0].created_at.toISOString();
          }
        }
      }

      const usageRows = await prisma.$queryRawUnsafe<Array<{ turns: string }>>(
        `SELECT coalesce(sum(turns_used),0)::text AS turns FROM agent.agent_usage_ledger
         WHERE chat_id = $1 AND month = to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`,
        chatIdNum
      );
      turnsUsed = Number(usageRows[0]?.turns ?? "0");

      const promoRows = await prisma.$queryRawUnsafe<Array<{ n: string }>>(
        `SELECT count(*)::text AS n FROM agent.agent_promo_redemption WHERE chat_id = $1`,
        chatIdNum
      );
      promoUsed = Number(promoRows[0]?.n ?? "0") > 0;

      maxTurns = tier === "basic" ? 150 : tier === "pro" ? 400 : tier === "premium" ? 1000 : 90;
    }

    // Evaluasi masa aktif trial 7 hari dari trialCreatedAt
    let trialDaysLeft = 0;
    if (trialUsed && trialCreatedAt) {
      const createdMs = new Date(trialCreatedAt).getTime();
      const trialEndMs = createdMs + 7 * 86400_000;
      const nowMs = Date.now();
      if (Number.isFinite(createdMs) && nowMs < trialEndMs && status !== "paid") {
        trialDaysLeft = Math.max(1, Math.ceil((trialEndMs - nowMs) / 86400_000));
        tier = "pro";
        status = "trial";
        periodEnd = new Date(trialEndMs).toISOString();
        maxTurns = 400;
      }
    }

    return NextResponse.json({
      email: session.email,
      chatBound,
      chatId,
      tier,
      status,
      periodEnd,
      turnsUsed,
      maxTurns,
      promoUsed,
      trialUsed,
      trialCreatedAt,
      trialDaysLeft,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // anon → 401 rapi (page /agent swap ke CTA register)
    if (/not authenticated|unauthorized/i.test(message)) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    console.error("[agent-membership]", message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
