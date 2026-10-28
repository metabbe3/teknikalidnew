import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Security-audit 28 Okt (findings: cron-secret-empty-default):
 * Semua route /api/cron/* WAJIB pakai guard ini —
 * 1. FAIL-CLOSED: CRON_SECRET kosong ⇒ 500 (bukan "Bearer " match-all).
 * 2. timingSafeEqual: compare konstan-waktu.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Env validation (config/env.ts) adalah dead code — tak ada yang import.
    // Ini baris pertahanan sesungguhnya: jangan pernah buka endpoint cron tanpa secret.
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
