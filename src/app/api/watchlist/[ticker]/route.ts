import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { watchlistService } from "@/domains/watchlist/watchlist.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const user = await requireAuth();
    const { ticker } = await params;

    await watchlistService.removeFromWatchlist(user.id, ticker);
    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    return handleApiError(error, "remove from watchlist");
  }
}
