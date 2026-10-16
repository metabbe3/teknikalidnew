import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { getContentPerformance } from "@/lib/admin-content-performance.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/articles/performance?days=7|30 — read-only article content
 * performance (bo-2026-10-14-03). Default 7; anything else -> 400.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const raw = new URL(request.url).searchParams.get("days") ?? "7";
    if (raw !== "7" && raw !== "30") {
      return NextResponse.json({ error: "days must be 7 or 30" }, { status: 400 });
    }

    const data = await getContentPerformance(raw === "30" ? 30 : 7);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch article performance");
  }
}
