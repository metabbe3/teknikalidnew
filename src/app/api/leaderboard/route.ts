import { NextResponse } from "next/server";
import { reputationService } from "@/domains/reputation/reputation.service";
import { handleApiError } from "@/lib/api-error";

export const revalidate = 300;

export async function GET() {
  try {
    const data = await reputationService.getWeeklyLeaderboard();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch leaderboard");
  }
}
