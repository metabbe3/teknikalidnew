import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Proxy history webchat agentd (restore jawaban Uhu setelah reload/pindah tab).
export async function GET() {
  // Origin check (CSRF — sama seperti /api/uhu)
  const h = await headers();
  const origin = h.get("origin");
  if (origin) {
    const host = h.get("host");
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
  }

  let email = "";
  try {
    const session = await requireAuth();
    email = String((session as { email?: string }).email ?? "").toLowerCase().trim();
  } catch {
    email = "";
  }
  if (!email) {
    return NextResponse.json({ error: "AUTH" }, { status: 401 });
  }

  const baseUrl = process.env.AGENTD_WEBCHAT_URL || "http://host.docker.internal:9101";
  const key = process.env.AGENTD_WEBCHAT_KEY || "";
  if (!key) return NextResponse.json({ ok: false, unavailable: true });

  try {
    const upstream = await fetch(
      `${baseUrl}/api/chat/history?email=${encodeURIComponent(email)}`,
      {
        headers: { "X-Webchat-Key": key },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!upstream.ok) {
      // Endpoint belum ada / upstream sibuk → no-op di client.
      return NextResponse.json({ ok: false, unavailable: true });
    }
    const data = (await upstream.json()) as unknown;
    return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, unavailable: true });
  }
}
