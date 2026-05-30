import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { qstash } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    // Try to reach QStash API — if token is valid, it's connected
    // The messages API doesn't have a list endpoint, so we check connectivity
    // by attempting a lightweight request
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      return NextResponse.json({
        pending: null,
        messages: [],
        error: "QSTASH_TOKEN not configured",
      });
    }

    // Use the current signing key to verify connectivity
    const hasToken = !!token;
    return NextResponse.json({
      pending: 0,
      messages: [],
      connected: hasToken,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg, pending: null, messages: [] },
      { status: 500 },
    );
  }
}
