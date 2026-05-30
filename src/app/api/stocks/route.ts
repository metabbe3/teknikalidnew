import { NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { handleApiError } from "@/lib/api-error";

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector") ?? undefined;
    const result = await stockMarketService.getStockList(sector);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch stocks");
  }
}
