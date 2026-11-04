import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// AGENT membership check (owner 5 Nov): endpoint yang dipakai halaman web agent utk
// cek status langganan + binding Telegram milik email session.
// GET /api/agent/membership → { tier, status, periodEnd, turnsUsed, maxTurns, chatBound, promoUsed }
export async function GET() {
  try {
    const session = await requireAuth();

    const bindRows = await prisma.$queryRawUnsafe<Array<{ chat_id: string }>>(
      `SELECT chat_id::text FROM agent.agent_web_binding WHERE email = $1 LIMIT 1`,
      session.email
    );
    const chatBound = bindRows.length > 0;
    const chatId = chatBound ? bindRows[0].chat_id : null;

    let tier = "free";
    let status: string | null = null;
    let periodEnd: string | null = null;
    let turnsUsed = 0;
    let maxTurns = 90;
    let promoUsed = false;

    if (chatId) {
      const subRows = await prisma.$queryRawUnsafe<
        Array<{ tier: string; status: string; period_end: Date | null }>
      >(
        `SELECT tier, status, period_end FROM agent.agent_subscription WHERE chat_id = $1 LIMIT 1`,
        chatId
      );
      if (subRows.length) {
        tier = subRows[0].tier;
        status = subRows[0].status;
        periodEnd = subRows[0].period_end ? subRows[0].period_end.toISOString() : null;
      }

      const usageRows = await prisma.$queryRawUnsafe<Array<{ turns: string }>>(
        `SELECT coalesce(sum(turns_used),0)::text AS turns FROM agent.agent_usage_ledger
         WHERE chat_id = $1 AND month = to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`,
        chatId
      );
      turnsUsed = Number(usageRows[0]?.turns ?? "0");

      const promoRows = await prisma.$queryRawUnsafe<Array<{ n: string }>>(
        `SELECT count(*)::text AS n FROM agent.agent_promo_redemption WHERE chat_id = $1`,
        chatId
      );
      promoUsed = Number(promoRows[0]?.n ?? "0") > 0;

      maxTurns = tier === "basic" ? 150 : tier === "pro" ? 600 : tier === "premium" ? 1500 : 90;
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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agent-membership]", message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
