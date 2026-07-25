import { NextRequest, NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { handleApiError } from "@/lib/api-error";
import { parseQuery, schemas } from "@/lib/validation";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.stockList);
    if (error) return error;

    const result = await stockMarketService.getStockList(data.sector);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch stocks");
  }
}
