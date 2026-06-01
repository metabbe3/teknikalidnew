import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { reputationService } from "@/domains/reputation/reputation.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get("userId") || session.user.id;
    const achievements = await reputationService.getUserAchievements(userId);
    return NextResponse.json({ data: achievements });
  } catch (error) {
    return handleApiError(error, "fetch achievements");
  }
}
