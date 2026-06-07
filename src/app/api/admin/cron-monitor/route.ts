import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { cronMonitoringService } from "@/domains/cron-monitoring/cron-monitoring.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const data = await cronMonitoringService.getDashboardData();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch cron monitor data");
  }
}
