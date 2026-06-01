import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authService.requireAuth();
    const { id } = await params;
    const result = await communityService.togglePin(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle pin");
  }
}
