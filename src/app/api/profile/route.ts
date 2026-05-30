import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await authService.requireAuth();
    const profile = await authService.getProfile(user.id);
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ data: profile });
  } catch (error) {
    return handleApiError(error, "fetch profile");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const body = await request.json();
    const updated = await authService.updateProfile(user.id, {
      name: body.name,
      bio: body.bio,
      username: body.username,
      socialLinks: body.socialLinks,
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error, "update profile");
  }
}
