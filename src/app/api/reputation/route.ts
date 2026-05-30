import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { reputationService } from "@/domains/reputation/reputation.service";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const user = await authService.requireAuth();
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("userId") || user.id;
    const result = await reputationService.getUserReputation(targetId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch reputation");
  }
}

export async function POST() {
  try {
    const user = await authService.requireAuth();
    const result = await reputationService.claimDailyReward(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "claim daily reward");
  }
}
