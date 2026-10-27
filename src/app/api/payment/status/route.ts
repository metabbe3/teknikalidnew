import { NextRequest, NextResponse } from "next/server";
import { getCoreApi } from "@/lib/midtrans";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  try {
    // Security-audit 28 Okt: sebelumnya TANPA auth — anonim bisa enumerate
    // order_id (pola TKID-PLAN-<userId publik>-<ts>) dan dapat PII korban.
    // Sekarang: wajib login + ownership check.
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    // order_id format TKID-PLAN-<userId>-<timestamp> — hanya pemilik (atau admin).
    if (session.role !== "ADMIN" && !orderId.includes(`-${session.id}-`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const core = getCoreApi();
    const status = await core.transactionStatus(orderId);

    return NextResponse.json({ status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to check status", detail: message },
      { status: 500 }
    );
  }
}
