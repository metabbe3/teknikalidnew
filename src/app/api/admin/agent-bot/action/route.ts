import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// ADMIN AGENT ACTIONS (owner 6 Nov "gas — agent sebagai entitas sendiri"):
// SATU route aksi operasional utk tab Agent admin panel.
// Aksi: SET_TIER | ADD_TURNS | RESET_TRIAL_MASS | SET_BAN | BIND_EMAIL | RESYNC_PAYMENT
// Desain (brainstorm Argon 6 Nov): audit via ops_config audit_agent_actions (100 terakhir),
// atomic SQL (turns_used = turns_used - N), agentd baca state/ops per-request ≤15s tanpa restart.

type ActionBody = {
  action: string;
  chatId?: string;
  tier?: string;
  days?: number;
  turns?: number;
  email?: string;
  reason?: string;
  complaintId?: string;
};

const json = (data: unknown, status = 200) =>
  NextResponse.json(JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v))), { status });

async function audit(action: string, detail: Record<string, unknown>) {
  // audit trail ringkas: key audit_agent_actions = JSON array max 100.
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `SELECT value FROM agent.agent_ops_config WHERE key = 'audit_agent_actions' LIMIT 1`
  );
  let list: unknown[] = [];
  try {
    list = rows[0]?.value ? JSON.parse(rows[0].value) : [];
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  list.push({ ts: new Date().toISOString(), action, ...detail });
  list = list.slice(-100);
  await prisma.$queryRawUnsafe(
    `INSERT INTO agent.agent_ops_config (key, value, updated_by)
     VALUES ('audit_agent_actions', $1, 'admin-panel')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    JSON.stringify(list)
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as ActionBody;
    const { action } = body;
    const chatId = body.chatId ? BigInt(body.chatId) : null;
    const reason = (body.reason || "").slice(0, 200);

    switch (action) {
      case "SET_TIER": {
        // Grant/extend/downgrade manual: tier = trial|basic|pro|premium, days = masa aktif.
        if (!chatId || !body.tier) return json({ error: "chatId & tier wajib" }, 400);
        const tier = body.tier.toLowerCase();
        if (!["trial", "basic", "pro", "premium"].includes(tier)) return json({ error: "tier invalid" }, 400);
        const days = Math.min(Math.max(body.days ?? 30, 1), 365);
        // FK: pastikan agent_user ada (dummy anon_id utk user yg belum pernah /start).
        await prisma.$queryRawUnsafe(
          `INSERT INTO agent.agent_user (chat_id, anon_id, state, created_at, updated_at)
           VALUES ($1, 'adminpanel', 'ACTIVE', now(), now())
           ON CONFLICT (chat_id) DO NOTHING`,
          chatId
        );
        await prisma.$queryRawUnsafe(
          `INSERT INTO agent.agent_subscription (chat_id, tier, status, period_end, updated_at)
           VALUES ($1, $2, 'paid', now() + ($3 || ' days')::interval, now())
           ON CONFLICT (chat_id) DO UPDATE
             SET tier = EXCLUDED.tier, status = 'paid',
                 period_end = GREATEST(COALESCE(agent_subscription.period_end, now()), now()) + ($3 || ' days')::interval,
                 updated_at = now()`,
          chatId, tier, String(days)
        );
        await audit("SET_TIER", { chatId: String(chatId), tier, days, reason });
        return json({ ok: true, message: `Tier ${tier.toUpperCase()} +${days} hari aktif` });
      }

      case "ADD_TURNS": {
        // Kompensasi/bonus turn: kurangi pemakaian bulan berjalan (tidak bisa < 0).
        if (!chatId || !body.turns) return json({ error: "chatId & turns wajib" }, 400);
        const turns = Math.min(Math.abs(body.turns), 500);
        const month = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 7);
        const res = await prisma.$queryRawUnsafe<Array<{ turns_used: number }>>(
          `INSERT INTO agent.agent_usage_ledger (chat_id, month, turns_used, feature, tokens_in, tokens_out, source)
           VALUES ($1, $2, -$3, 'admin_grant', 0, 0, 'admin-panel')
           ON CONFLICT (chat_id, month, feature, source) DO UPDATE
             SET turns_used = GREATEST(0, agent_usage_ledger.turns_used - $3), updated_at = now()
           RETURNING turns_used`,
          chatId, month, turns
        );
        void res;
        await audit("ADD_TURNS", { chatId: String(chatId), turns, reason });
        return json({ ok: true, message: `+${turns} turn dikompensasi`, remaining: res[0] });
      }

      case "LIST_COMPLAINTS": {
        // Owner 6 Nov: satu pintu keluhan (bot /keluhan + web form) — list utk admin panel.
        const rows = await prisma.$queryRawUnsafe<Array<{
          id: number; chat_id: bigint; message: string; status: string; created_at: Date;
        }>>(
          `SELECT id, chat_id, message, status, created_at
             FROM agent.agent_complaint
            WHERE status = 'open'
            ORDER BY created_at DESC LIMIT 50`
        );
        return json({ ok: true, complaints: rows });
      }

      case "RESOLVE_COMPLAINT": {
        if (!body.complaintId) return json({ error: "complaintId wajib" }, 400);
        await prisma.$queryRawUnsafe(
          `UPDATE agent.agent_complaint SET status = 'resolved' WHERE id = $1`,
          BigInt(body.complaintId)
        );
        await audit("RESOLVE_COMPLAINT", { complaintId: String(body.complaintId), reason });
        return json({ ok: true });
      }

      case "RESET_TRIAL_MASS": {
        // Reset kuota SEMUA user trial hari ini (outage/launch reset — "seperti reset AI provider").
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        const res = await prisma.$queryRawUnsafe<{ count: number }[]>(
          `WITH del AS (
             DELETE FROM agent.agent_usage_ledger
             WHERE month = $1
               AND chat_id NOT IN (SELECT chat_id FROM agent.agent_subscription WHERE status IN ('paid','trial') AND period_end > now())
             RETURNING 1)
           SELECT count(*)::int AS count FROM del`,
          today
        );
        const n = Number(res[0]?.count ?? 0);
        await audit("RESET_TRIAL_MASS", { affected: n, reason });
        return json({ ok: true, message: `Kuota harian direset utk ${n} user trial` });
      }

      case "SET_BAN": {
        // Ban/unban: state agent_user = BANNED | ACTIVE. agentd middleware cek state.
        if (!chatId) return json({ error: "chatId wajib" }, 400);
        const banned = body.tier !== "unban"; // tier dipakai sbg flag utk hemat field: "unban" = unban
        await prisma.$queryRawUnsafe(
          `INSERT INTO agent.agent_user (chat_id, anon_id, state, created_at, updated_at)
           VALUES ($1, 'adminpanel', $2, now(), now())
           ON CONFLICT (chat_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
          chatId, banned ? "BANNED" : "ACTIVE"
        );
        await audit("SET_BAN", { chatId: String(chatId), banned, reason });
        return json({ ok: true, message: banned ? "User di-BAN" : "Ban dicabut" });
      }

      case "BIND_EMAIL": {
        // Manual bind/ganti email ↔ chat (salah ketik email / pindah akun).
        if (!chatId || !body.email) return json({ error: "chatId & email wajib" }, 400);
        const email = body.email.toLowerCase().trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email invalid" }, 400);
        await prisma.$queryRawUnsafe(
          `INSERT INTO agent.agent_web_binding (email, chat_id, bound_at)
           VALUES ($1, $2, now())
           ON CONFLICT (email) DO UPDATE SET chat_id = EXCLUDED.chat_id, bound_at = now()`,
          email, chatId
        );
        await audit("BIND_EMAIL", { chatId: String(chatId), email, reason });
        return json({ ok: true, message: `Binding ${email} ↔ ${chatId} tersimpan` });
      }

      case "RESYNC_PAYMENT": {
        // Re-sync langganan dari agent_payment_event settlement terakhir (webhook telat).
        if (!chatId) return json({ error: "chatId wajib" }, 400);
        const ev = await prisma.$queryRawUnsafe<Array<{ payment_status: string; order_id: string }>>(
          `SELECT payment_status, order_id FROM agent.agent_payment_event
           WHERE chat_id = $1 ORDER BY processed_at DESC LIMIT 1`, chatId
        );
        if (!ev.length) return json({ ok: false, message: "Tidak ada payment event" });
        await audit("RESYNC_PAYMENT", { chatId: String(chatId), last: ev[0], reason });
        return json({ ok: true, message: `Event terakhir: ${ev[0].payment_status} (${ev[0].order_id}) — cek manual di Midtrans` });
      }

      default:
        return json({ error: "action tidak dikenal" }, 400);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-agent-action]", message);
    return json({ error: "Failed" }, 500);
  }
}
