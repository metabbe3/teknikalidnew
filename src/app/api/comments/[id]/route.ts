import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authService.requireAuth();
    const { id } = await params;
    const result = await communityService.deleteComment(user, id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "delete comment");
  }
}
