import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { moderationService } from "@/domains/moderation/moderation.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = searchParams.get("limit");

    const result = await moderationService.getPendingReports(cursor, limit);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch reports");
  }
}
