/**
 * Proxy endpoint SSE untuk Uhu Web Chat (/api/uhu).
 *
 * Alasan rute baru (API Reuse Rule #4):
 * - Domain baru: jembatan server-to-server berautentikasi (X-Webchat-Key) ke daemon eksternal
 *   `agentd` (host.docker.internal:9101) untuk percakapan interaktif SSE (`/api/chat` & `/api/chat/status`).
 * - Tidak melakukan kalkulasi market data (change/breadth/movers); semua market data di dalam agentd
 *   tetap bersumber dari single source of truth yang sudah ada.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const DEFAULT_AGENTD_URL = "http://host.docker.internal:9101";

function getAgentdConfig() {
  const baseUrl = (process.env.AGENTD_WEBCHAT_URL || DEFAULT_AGENTD_URL).replace(/\/+$/, "");
  const webchatKey = process.env.AGENTD_WEBCHAT_KEY?.trim() || "";
  return { baseUrl, webchatKey };
}

export async function GET() {
  const { baseUrl, webchatKey } = getAgentdConfig();
  if (!webchatKey) {
    return NextResponse.json({ ok: false, error: "UHU_DISABLED" }, { status: 503 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/api/chat/status`, {
      method: "GET",
      headers: {
        "X-Webchat-Key": webchatKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      return NextResponse.json({ ok: false }, { status: upstream.status });
    }

    const data = (await upstream.json().catch(() => ({}))) as { ok?: boolean };
    return NextResponse.json({ ok: Boolean(data.ok ?? true) });
  } catch {
    return NextResponse.json({ ok: false, error: "AGENT_OFFLINE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const { baseUrl, webchatKey } = getAgentdConfig();
  if (!webchatKey) {
    return NextResponse.json({ error: "UHU_DISABLED" }, { status: 503 });
  }

  // 1. Auth session check (pola api/agent/membership/route.ts)
  let email = "";
  try {
    const session = await requireAuth();
    email = String(session.email ?? "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "AUTH" }, { status: 401 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authenticated|unauthorized|suspended/i.test(message)) {
      return NextResponse.json({ error: "AUTH" }, { status: 401 });
    }
    return NextResponse.json({ error: "AUTH" }, { status: 401 });
  }

  // 2. Parse body { text, pageContext? }
  let body: { text?: unknown; pageContext?: unknown } = {};
  try {
    body = (await request.json()) as { text?: unknown; pageContext?: unknown };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const pageContext =
    typeof body.pageContext === "string" && body.pageContext.trim()
      ? body.pageContext.trim().slice(0, 200)
      : undefined;

  if (!text) {
    return NextResponse.json({ error: "EMPTY_TEXT" }, { status: 400 });
  }

  // 3. Forward ke agentd POST /api/chat
  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Webchat-Key": webchatKey,
      },
      body: JSON.stringify({
        email,
        text,
        ...(pageContext ? { pageContext } : {}),
      }),
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return NextResponse.json({ error: "AGENT_OFFLINE" }, { status: 503 });
  }

  // 4. Error mapping sebelum SSE stream
  if (!upstream.ok) {
    const errData = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (upstream.status === 409 || errData.error === "NO_BINDING") {
      return NextResponse.json({ error: "NO_BINDING" }, { status: 409 });
    }

    if (upstream.status === 429) {
      return NextResponse.json(
        {
          error: errData.error || "RATE_LIMIT",
          message: errData.message || "Kuota percakapan habis atau terlalu cepat.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: errData.error || "UPSTREAM_ERROR",
        message: errData.message || "Gagal memproses permintaan ke Uhu.",
      },
      { status: upstream.status }
    );
  }

  if (!upstream.body) {
    return NextResponse.json({ error: "AGENT_OFFLINE" }, { status: 503 });
  }

  // 5. Passive stream chunk read+write (tanpa buffer penuh)
  const upstreamReader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await upstreamReader.read();
        if (done) {
          controller.close();
          return;
        }
        if (value) {
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      void upstreamReader.cancel();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
