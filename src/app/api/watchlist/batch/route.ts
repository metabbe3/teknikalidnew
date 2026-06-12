import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { watchlistService } from "@/domains/watchlist/watchlist.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { tickers } = body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: "tickers must be a non-empty array of strings" },
        { status: 400 },
      );
    }

    const result = await watchlistService.addBatch(user.id, tickers);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "batch add to watchlist");
  }
}
