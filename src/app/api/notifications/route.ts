import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/**
 * In-app Web Notifications API (/api/notifications)
 *
 * Sumber data: tabel `agent.web_notification` (id, chat_id, kind, title, body, url, created_at, read_at)
 * yang ditulis oleh daemon `agentd`.
 * Mapping user web -> chat_id via `agent.agent_web_binding(email)` (chat_id bisa negatif untuk
 * virtual web binding tanpa Telegram, maupun positif untuk akun yang sudah bind Telegram).
 * Jika belum ada baris binding, kembalikan `{ items: [], unread: 0 }` tanpa membuat binding baru
 * (agentd yang akan membuat virtual binding saat chat pertama).
 */

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export type WebNotificationKind = "blast" | "pulse" | "alert";

export interface WebNotificationItem {
  id: number | string;
  kind: WebNotificationKind;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  read: boolean;
}

interface RawBindingRow {
  chat_id: string;
}

interface RawNotifRow {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  url: string | null;
  created_at: Date | string;
  read_at: Date | string | null;
}

function normalizeKind(raw: string | null | undefined): WebNotificationKind {
  if (raw === "blast" || raw === "pulse" || raw === "alert") {
    return raw;
  }
  return "alert";
}

function isMissingRelationError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /web_notification.*does not exist|42P01/i.test(msg);
}

async function resolveBoundChatId(emailLower: string): Promise<string | null> {
  if (!emailLower) return null;

  const bindRows = await prisma.$queryRaw<RawBindingRow[]>`
    SELECT chat_id::text AS chat_id
    FROM agent.agent_web_binding
    WHERE lower(email) = ${emailLower}
    LIMIT 1
  `;

  const rawChatId = bindRows.length > 0 ? String(bindRows[0].chat_id ?? "").trim() : "";
  if (!rawChatId || !/^-?\d+$/.test(rawChatId) || rawChatId === "0") {
    return null;
  }

  return rawChatId;
}

export async function GET() {
  try {
    const session = await requireAuth();
    const emailLower = String(session.email ?? "").toLowerCase().trim();

    const chatIdStr = await resolveBoundChatId(emailLower);
    if (!chatIdStr) {
      return NextResponse.json(
        { unread: 0, items: [] },
        { headers: NO_STORE_HEADERS }
      );
    }

    let rows: RawNotifRow[] = [];
    let unread = 0;

    try {
      const [notifRows, unreadRows] = await Promise.all([
        prisma.$queryRaw<RawNotifRow[]>`
          SELECT
            id::text AS id,
            kind,
            title,
            body,
            url,
            created_at,
            read_at
          FROM agent.web_notification
          WHERE chat_id = ${chatIdStr}::bigint
          ORDER BY created_at DESC
          LIMIT 30
        `,
        prisma.$queryRaw<Array<{ unread: string }>>`
          SELECT count(*)::text AS unread
          FROM agent.web_notification
          WHERE chat_id = ${chatIdStr}::bigint
            AND read_at IS NULL
        `,
      ]);

      rows = notifRows;
      unread = Number.parseInt(unreadRows[0]?.unread ?? "0", 10) || 0;
    } catch (dbErr: unknown) {
      if (isMissingRelationError(dbErr)) {
        return NextResponse.json(
          { unread: 0, items: [] },
          { headers: NO_STORE_HEADERS }
        );
      }
      throw dbErr;
    }

    const items: WebNotificationItem[] = rows.map((r) => {
      const rawId = String(r.id ?? "");
      const parsedId = Number.parseInt(rawId, 10);
      const id: number | string =
        /^\d+$/.test(rawId) && Number.isSafeInteger(parsedId) ? parsedId : rawId;

      const createdAt =
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : new Date(r.created_at).toISOString();

      return {
        id,
        kind: normalizeKind(r.kind),
        title: String(r.title ?? ""),
        body: String(r.body ?? ""),
        url: r.url ? String(r.url) : null,
        createdAt,
        read: r.read_at !== null && r.read_at !== undefined,
      };
    });

    return NextResponse.json(
      { unread, items },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authenticated|unauthorized|suspended/i.test(message)) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }
    console.error("[api/notifications GET]", message);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const emailLower = String(session.email ?? "").toLowerCase().trim();

    let body: { action?: unknown; id?: unknown } = {};
    try {
      body = (await request.json()) as { action?: unknown; id?: unknown };
    } catch {
      return NextResponse.json(
        { error: "INVALID_BODY" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (body.action !== "mark-read") {
      return NextResponse.json(
        { error: "INVALID_ACTION" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const chatIdStr = await resolveBoundChatId(emailLower);
    if (!chatIdStr) {
      return NextResponse.json(
        { ok: true, updated: 0 },
        { headers: NO_STORE_HEADERS }
      );
    }

    const rawId =
      body.id !== undefined && body.id !== null ? String(body.id).trim() : "";

    try {
      if (rawId) {
        await prisma.$executeRaw`
          UPDATE agent.web_notification
          SET read_at = now()
          WHERE chat_id = ${chatIdStr}::bigint
            AND id::text = ${rawId}
            AND read_at IS NULL
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE agent.web_notification
          SET read_at = now()
          WHERE chat_id = ${chatIdStr}::bigint
            AND read_at IS NULL
        `;
      }
    } catch (dbErr: unknown) {
      if (isMissingRelationError(dbErr)) {
        return NextResponse.json(
          { ok: true, updated: 0 },
          { headers: NO_STORE_HEADERS }
        );
      }
      throw dbErr;
    }

    return NextResponse.json(
      { ok: true },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authenticated|unauthorized|suspended/i.test(message)) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }
    console.error("[api/notifications POST]", message);
    return NextResponse.json(
      { error: "Failed to mark notifications read" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
