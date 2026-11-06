import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// USER INSPECTOR (owner 6 Nov): 1 layar = semua konteks user agent.
// GET /api/admin/agent-bot/user/<chatId> → profil, binding email, subscription,
// pemakaian, watchlist, pembayaran, 20 chat terakhir, feedback.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    await requireAdmin();
    const { chatId: chatStr } = await params;
    if (!/^\d+$/.test(chatStr)) {
      return NextResponse.json({ error: "chatId harus angka" }, { status: 400 });
    }
    const chatId = BigInt(chatStr);

    const [userRows, bindRows, subRows, usageRows, watchRows, payRows, msgRows, fbRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ state: string | null; created_at: Date; last_active_at: Date | null; anon_id: string | null }>>(
        `SELECT state, created_at, last_active_at, anon_id FROM agent.agent_user WHERE chat_id = $1`, chatId),
      prisma.$queryRawUnsafe<Array<{ email: string; bound_at: Date }>>(
        `SELECT email, bound_at FROM agent.agent_web_binding WHERE chat_id = $1`, chatId),
      prisma.$queryRawUnsafe<Array<{ tier: string; status: string; period_end: Date | null }>>(
        `SELECT tier, status, period_end FROM agent.agent_subscription WHERE chat_id = $1`, chatId),
      prisma.$queryRawUnsafe<Array<{ month: string; turns_used: number; feature: string }>>(
        `SELECT month, turns_used, feature FROM agent.agent_usage_ledger
         WHERE chat_id = $1 AND month >= to_char(now() - interval '3 months', 'YYYY-MM')
         ORDER BY month DESC LIMIT 12`, chatId),
      prisma.$queryRawUnsafe<Array<{ ticker: string }>>(
        `SELECT ticker FROM agent.agent_watchlist WHERE chat_id = $1 ORDER BY ticker LIMIT 30`, chatId),
      prisma.$queryRawUnsafe<Array<{ order_id: string; payment_status: string; gross_amount: number; processed_at: Date }>>(
        `SELECT order_id, payment_status, gross_amount, processed_at FROM agent.agent_payment_event
         WHERE chat_id = $1 ORDER BY processed_at DESC LIMIT 10`, chatId),
      prisma.$queryRawUnsafe<Array<{ dir: string; text: string; created_at: Date }>>(
        `SELECT dir, LEFT(content_redacted, 400) AS text, created_at FROM agent.agent_message_log
         WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 20`, chatId),
      prisma.$queryRawUnsafe<Array<{ rating: string; created_at: Date }>>(
        `SELECT rating, created_at FROM agent.agent_feedback WHERE chat_id = $1
         ORDER BY created_at DESC LIMIT 10`, chatId),
    ]);

    const payload = {
      chatId: chatStr,
      user: userRows[0] ?? null,
      email: bindRows[0]?.email ?? null,
      boundAt: bindRows[0]?.bound_at ?? null,
      subscription: subRows[0] ?? null,
      usage: usageRows,
      watchlist: watchRows.map((w) => w.ticker),
      payments: payRows,
      messages: msgRows.reverse(),
      feedback: fbRows,
    };

    return NextResponse.json(JSON.parse(JSON.stringify(payload, (_k, v) => (typeof v === "bigint" ? Number(v) : v))));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authenticated|unauthorized|forbidden/i.test(message)) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    console.error("[admin-agent-user]", message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
