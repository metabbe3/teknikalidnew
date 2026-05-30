import { NextResponse } from "next/server";
import { authService } from "@/domains/auth/auth.service";
import { socialGraphService } from "@/domains/social/social-graph.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await authService.requireAuth();
    const { ticker } = await request.json();
    if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });

    const result = await socialGraphService.toggleStockFollow(user.id, ticker);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "toggle stock follow");
  }
}

export async function GET(request: Request) {
  try {
    const user = await authService.getCurrentUser();
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });

    const following = await socialGraphService.getStockFollowStatus(user?.id, ticker);
    return NextResponse.json({ following });
  } catch (error) {
    return handleApiError(error, "check stock follow status");
  }
}
