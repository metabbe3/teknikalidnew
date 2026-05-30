import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { moderationService } from "@/domains/moderation/moderation.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { targetType, targetId, reason } = await request.json();

    const report = await moderationService.createReport(
      user.id,
      targetType,
      targetId,
      reason,
    );

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "create report");
  }
}
