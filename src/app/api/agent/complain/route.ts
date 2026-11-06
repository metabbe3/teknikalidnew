import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// Owner 6 Nov "biar gak bingung complain dimana": SATU PINTU keluhan dari web
// teknikal.id → tabel agent.agent_complaint (sama dgn /keluhan di bot Telegram).
// chat_id: dari binding email (kalau user terikat), else 0 = sumber WEB.
// Notifikasi owner: dititipkan ke agent.agent_ops_config (key complaint_notif_<id>)
// yang dipoll agentd tiap 5s → dikirim via bot token agentd existing (tanpa kirim TG dari web).
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string; email?: string };
    const message = (body.message || "").trim().slice(0, 2000);
    if (message.length < 5) {
      return NextResponse.json({ error: "Keluhan minimal 5 karakter" }, { status: 400 });
    }

    let rawEmail = (body.email || "").trim();
    if (!rawEmail) {
      const user = await getCurrentUser().catch(() => null);
      if (user?.email) rawEmail = user.email;
    }

    let chatIdNum = 0;
    let emailTag = "";
    if (rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      emailTag = rawEmail.toLowerCase().slice(0, 160);
      const bind = await prisma.$queryRawUnsafe<Array<{ chat_id: string }>>(
        `SELECT chat_id::text FROM agent.agent_web_binding WHERE lower(email) = $1 LIMIT 1`,
        emailTag
      );
      if (bind.length > 0) {
        const parsed = Number.parseInt(String(bind[0].chat_id), 10);
        if (Number.isSafeInteger(parsed) && !Number.isNaN(parsed) && parsed !== 0) {
          chatIdNum = parsed;
        }
      }
    }

    const labeled = emailTag ? `[WEB|${emailTag}] ${message}` : `[WEB] ${message}`;
    const inserted = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO agent.agent_complaint (chat_id, message) VALUES ($1, $2) RETURNING id::text AS id`,
      chatIdNum,
      labeled
    );
    const complaintId = inserted[0]?.id ?? String(Date.now());

    // Queue owner notification via agent.agent_ops_config (polled by agentd every 5s).
    await prisma
      .$queryRawUnsafe(
        `DELETE FROM agent.agent_ops_config
         WHERE key LIKE 'complaint_notif_%'
           AND (value = '' OR updated_at < now() - interval '7 days')`
      )
      .catch(() => undefined);

    const notifPayload = JSON.stringify({
      id: complaintId,
      chatId: chatIdNum,
      email: emailTag || "",
      message,
    });
    await prisma
      .$queryRawUnsafe(
        `INSERT INTO agent.agent_ops_config (key, value, updated_by)
         VALUES ($1, $2, 'web-complain')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        `complaint_notif_${complaintId}`,
        notifPayload
      )
      .catch((err) => {
        console.warn("[agent-complain] notif queue failed:", err);
      });

    return NextResponse.json({ ok: true, id: complaintId });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
