import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await authService.requireAuth();
    const { targetUserId } = await request.json();
    const result = await socialGraphService.toggleBlock(user.id, targetUserId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle block");
  }
}
