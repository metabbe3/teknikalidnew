import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { dashboardService } from "@/domains/dashboard/dashboard.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await dashboardService.getSummary(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch dashboard summary");
  }
}
