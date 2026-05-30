import { NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await stockMarketService.getSparklines();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "fetch sparklines");
  }
}
