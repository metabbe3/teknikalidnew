import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// AGENT bind Telegram (owner 5 Nov): user web menghubungkan akun Telegram.
// Flow: user buka bot → /start <bindToken> → agentd menulis binding (email ↔ chat_id)
// ke agent.agent_web_binding. Endpoint ini MEMBUAT token bind sekali-pakai (TTL 15 mnt)
// dan mengembalikan deep-link bot. agentd memvalidasi token saat /start.
//
// Token format: hex 32 char, disimpan di agent.agent_ops_config key `bind_<token>`
// value = email, TTL diceg agentd saat redeem (hapus setelah dipakai).
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const email = session.email as string;

    // Rate-limit ringan: maks 3 token aktif per email (cleanup lama).
    await prisma.$queryRawUnsafe(
      `DELETE FROM agent.agent_ops_config WHERE key LIKE 'bind_%' AND updated_at < now() - interval '15 minutes'`
    );

    const token = cryptoRandomHex(16);

    await prisma.$queryRawUnsafe(
      `INSERT INTO agent.agent_ops_config (key, value, updated_by)
       VALUES ($1, $2, 'web-bind')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      `bind_${token}`,
      email
    );

    const botName = process.env.NEXT_PUBLIC_AGENT_BOT_NAME ?? "TeknikalAgentBot";
    return NextResponse.json({
      bindUrl: `https://t.me/${botName}?start=${token}`,
      expiresInMin: 15,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agent-bind]", message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

function cryptoRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
