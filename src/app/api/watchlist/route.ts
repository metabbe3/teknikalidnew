import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { watchlistService } from "@/domains/watchlist/watchlist.service";
import { parseBody, parseQuery, schemas } from "@/lib/validation";
import { z } from "zod";

type WatchlistQuery = z.infer<z.ZodObject<{ ticker: z.ZodOptional<z.ZodString> }>>;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const [data, error] = parseQuery(
      searchParams,
      z.object({
        ticker: schemas.ticker.optional(),
      }),
    );
    if (error) return error;

    const typedData = data as WatchlistQuery;
    if (typedData.ticker) {
      const result = await watchlistService.getStatus(user.id, typedData.ticker);
      return NextResponse.json(result);
    }

    const dataResult = await watchlistService.getWatchlist(user.id);
    return NextResponse.json({ data: dataResult });
  } catch (error) {
    return handleApiError(error, "fetch watchlist");
  }
}

type AddToWatchlistBody = z.infer<typeof schemas.addToWatchlist>;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const [data, error] = await parseBody(request, schemas.addToWatchlist);
    if (error) return error;

    const typedData = data as AddToWatchlistBody;
    const entry = await watchlistService.addToWatchlist(user.id, typedData.ticker);
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "add to watchlist");
  }
}
