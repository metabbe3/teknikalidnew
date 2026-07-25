import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { handleApiError } from "@/lib/api-error";
import { parseBody, schemas } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await authService.requireAuth();
    const [data, error] = await parseBody(request, schemas.follow);
    if (error) return error;

    const result = await socialGraphService.toggleFollow(user.id, data.userId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle follow");
  }
}

export async function GET(request: Request) {
  try {
    const user = await authService.getCurrentUser();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const following = await socialGraphService.getFollowStatus(user?.id, userId);
    return NextResponse.json({ following });
  } catch (error) {
    return handleApiError(error, "check follow status");
  }
}
