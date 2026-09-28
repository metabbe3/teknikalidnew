import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Queue configuration status. QStash has no list-pending API with a signing key,
 * so this reports configuration only — no fabricated counts.
 */
export async function GET() {
  try {
    await requireAdmin();

    const token = process.env.QSTASH_TOKEN;
    return NextResponse.json({
      configured: !!token,
      provider: token ? "qstash" : null,
      messages: [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg, messages: [] }, { status: 500 });
  }
}
