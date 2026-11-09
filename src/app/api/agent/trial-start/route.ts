import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// AGENT Free Trial 7 Hari (owner 10 Nov):
// Endpoint POST /api/agent/trial-start — aktifkan Trial Pro 7 hari untuk user registered
// yang belum paid. Guard sekali seumur akun tanpa migrasi skema Prisma via
// agent.agent_ops_config (PK key `trial_used_<email>` + `trial_chat_<chatId>`) dan
// sinkron ke agent.agent_subscription bila Telegram sudah terhubung.
export async function POST() {
  try {
    const session = await requireAuth();
    const email = String(session.email ?? "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const emailKey = `trial_used_${email}`;

    // 1. Cek apakah email sudah pernah pakai trial
    const existingEmailTrial = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
      `SELECT key FROM agent.agent_ops_config WHERE key = $1 LIMIT 1`,
      emailKey
    );
    if (existingEmailTrial.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "TRIAL_ALREADY_USED",
          message: "Trial Pro 7 hari hanya berlaku sekali seumur akun.",
        },
        { status: 409 }
      );
    }

    // 2. Cek apakah email sudah bind ke chat_id Telegram
    const bindRows = await prisma.$queryRawUnsafe<Array<{ chat_id: string }>>(
      `SELECT chat_id::text FROM agent.agent_web_binding WHERE lower(email) = $1 LIMIT 1`,
      email
    );
    const rawChatId = bindRows.length > 0 ? bindRows[0].chat_id : null;
    const chatIdNum = rawChatId !== null ? Number.parseInt(String(rawChatId), 10) : Number.NaN;
    const chatBound =
      Number.isSafeInteger(chatIdNum) && !Number.isNaN(chatIdNum) && chatIdNum !== 0;

    if (chatBound) {
      const chatKey = `trial_chat_${chatIdNum}`;
      const existingChatTrial = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
        `SELECT key FROM agent.agent_ops_config WHERE key = $1 LIMIT 1`,
        chatKey
      );
      if (existingChatTrial.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "TRIAL_ALREADY_USED",
            message: "Trial Pro 7 hari sudah pernah digunakan pada akun Telegram ini.",
          },
          { status: 409 }
        );
      }

      const subRows = await prisma.$queryRawUnsafe<
        Array<{ status: string; order_id: string | null }>
      >(
        `SELECT status, order_id FROM agent.agent_subscription WHERE chat_id = $1 LIMIT 1`,
        chatIdNum
      );
      if (subRows.length > 0) {
        if (subRows[0].status === "paid") {
          return NextResponse.json(
            {
              ok: false,
              error: "ALREADY_PAID",
              message: "Paket berbayar Anda sudah aktif.",
            },
            { status: 409 }
          );
        }
        if (subRows[0].order_id && subRows[0].order_id.startsWith("TRIAL7-")) {
          return NextResponse.json(
            {
              ok: false,
              error: "TRIAL_ALREADY_USED",
              message: "Trial Pro 7 hari sudah pernah digunakan.",
            },
            { status: 409 }
          );
        }
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const endsAtIso = new Date(now.getTime() + 7 * 86400_000).toISOString();
    const payload = JSON.stringify({
      email,
      userId: session.id ?? null,
      chatId: chatBound ? String(chatIdNum) : null,
      tier: "pro",
      days: 7,
      createdAt: nowIso,
      periodEnd: endsAtIso,
    });

    // 3. Atomic guard insert via PK agent.agent_ops_config
    const inserted = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
      `INSERT INTO agent.agent_ops_config (key, value, updated_by)
       VALUES ($1, $2, 'web-trial-start')
       ON CONFLICT (key) DO NOTHING
       RETURNING key`,
      emailKey,
      payload
    );

    if (inserted.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "TRIAL_ALREADY_USED",
          message: "Trial Pro 7 hari hanya berlaku sekali seumur akun.",
        },
        { status: 409 }
      );
    }

    // 4. Jika Telegram sudah terhubung, catat guard chat & aktifkan di agent.agent_subscription
    if (chatBound) {
      const chatKey = `trial_chat_${chatIdNum}`;
      await prisma.$queryRawUnsafe(
        `INSERT INTO agent.agent_ops_config (key, value, updated_by)
         VALUES ($1, $2, 'web-trial-start')
         ON CONFLICT (key) DO NOTHING`,
        chatKey,
        payload
      );

      const anonSeed = `tr${String(chatIdNum).slice(-10)}`.slice(0, 12);
      await prisma.$queryRawUnsafe(
        `INSERT INTO agent.agent_user (chat_id, anon_id, state, created_at, updated_at)
         VALUES ($1, $2, 'active', now(), now())
         ON CONFLICT (chat_id) DO NOTHING`,
        chatIdNum,
        anonSeed
      );

      const trialOrderId = `TRIAL7-${chatIdNum}-${Date.now()}`;
      await prisma.$queryRawUnsafe(
        `INSERT INTO agent.agent_subscription (chat_id, tier, status, period_end, order_id, created_at, updated_at)
         VALUES ($1, 'pro', 'trial', now() + interval '7 days', $2, now(), now())
         ON CONFLICT (chat_id) DO UPDATE
           SET tier = 'pro',
               status = 'trial',
               period_end = now() + interval '7 days',
               order_id = EXCLUDED.order_id,
               updated_at = now()
         WHERE agent.agent_subscription.status <> 'paid'`,
        chatIdNum,
        trialOrderId
      );
    }

    return NextResponse.json({
      ok: true,
      days: 7,
      createdAt: nowIso,
      periodEnd: endsAtIso,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authenticated|unauthorized/i.test(message)) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    console.error("[agent-trial-start]", message);
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 });
  }
}
