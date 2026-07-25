import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { reputationService } from "@/domains/reputation/reputation.service";
import { reputationRepository } from "@/domains/reputation/reputation.repository";
import { handleApiError } from "@/lib/api-error";
import { parseQuery, schemas } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = await authService.requireAuth();
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.reputationQuery);
    if (error) return error;

    const targetId = data.userId || user.id;
    const result = await reputationService.getUserReputation(targetId);
    const streakUser = await reputationRepository.findUserReputation(targetId);
    return NextResponse.json({
      ...result,
      streak: streakUser?.dailyStreak ?? 0,
    });
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
