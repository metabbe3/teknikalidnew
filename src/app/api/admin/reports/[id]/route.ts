import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { auditService } from "@/domains/audit/audit.service";
import { moderationService } from "@/domains/moderation/moderation.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const { action } = await request.json();

    const result = await moderationService.reviewReport(id, action);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    await auditService.log(user.id, "admin:review_report", { reportId: id, action }, ip);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "update report");
  }
}
