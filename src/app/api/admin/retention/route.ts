import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { getRetentionOverview } from "@/lib/retention.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/retention — satu sumber kebenaran retensi (PRD idea-2026-10-01-1).
 * returning IP % mingguan (Senin-Minggu WIB) vs guard 12% + cohort D1/D7 +
 * dead-letter notifikasi. Cache 5 menit di service. Count-only, 0 PII.
 */
export async function GET() {
  try {
    await requireAdmin();
    const overview = await getRetentionOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return handleApiError(error, "fetch retention overview");
  }
}
