import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { parseBody, schemas } from "@/lib/validation";
import { watchlistService } from "@/domains/watchlist/watchlist.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const [data, error] = await parseBody(request, schemas.watchlistBatch);
    if (error) return error;

    const result = await watchlistService.addBatch(user.id, data.tickers);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "batch add to watchlist");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const [data, error] = await parseBody(request, schemas.watchlistBatch);
    if (error) return error;

    const result = await watchlistService.removeBatch(user.id, data.tickers);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "batch remove from watchlist");
  }
}
