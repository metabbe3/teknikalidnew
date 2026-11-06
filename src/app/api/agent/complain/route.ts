import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Owner 6 Nov "biar gak bingung complain dimana": SATU PINTU keluhan dari web
// teknikal.id → tabel agent.agent_complaint (sama dgn /keluhan di bot Telegram).
// chat_id: dari binding email (kalau user terikat), else 0 = sumber WEB.
// Notifikasi owner: dibaca admin panel (LIST_COMPLAINTS) + nightly ops.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string; email?: string };
    const message = (body.message || "").trim().slice(0, 2000);
    if (message.length < 5) {
      return NextResponse.json({ error: "Keluhan minimal 5 karakter" }, { status: 400 });
    }
    let chatId = BigInt(0);
    let emailTag = "";
    if (body.email && /.+@.+\..+/.test(body.email)) {
      emailTag = body.email.trim().toLowerCase();
      const bind = await prisma.$queryRawUnsafe<Array<{ chat_id: bigint }>>(
        `SELECT chat_id FROM agent.agent_web_binding WHERE lower(email) = $1 LIMIT 1`,
        emailTag
      );
      if (bind.length > 0) chatId = bind[0].chat_id;
    }
    const labeled = emailTag ? `[WEB|${emailTag}] ${message}` : `[WEB] ${message}`;
    await prisma.$queryRawUnsafe(
      `INSERT INTO agent.agent_complaint (chat_id, message) VALUES ($1, $2)`,
      chatId, labeled
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
