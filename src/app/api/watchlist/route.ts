import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { watchlistService } from "@/domains/watchlist/watchlist.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    if (ticker) {
      const result = await watchlistService.getStatus(user.id, ticker);
      return NextResponse.json(result);
    }

    const data = await watchlistService.getWatchlist(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch watchlist");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ticker } = body;

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json(
        { error: "Ticker is required" },
        { status: 400 }
      );
    }

    const entry = await watchlistService.addToWatchlist(user.id, ticker);
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "add to watchlist");
  }
}
