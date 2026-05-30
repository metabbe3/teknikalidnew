import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await authService.requireAuth();
    const result = await communityService.getUserBookmarks(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch bookmarks");
  }
}

export async function POST(request: Request) {
  try {
    const user = await authService.requireAuth();
    const { postId } = await request.json();
    if (!postId)
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });

    const result = await communityService.toggleBookmark(user.id, postId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle bookmark");
  }
}
