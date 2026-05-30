import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const body = await request.json();
    const updated = await authService.completeProfile(user.id, body.username, body.name);
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    return handleApiError(error, "complete profile");
  }
}
