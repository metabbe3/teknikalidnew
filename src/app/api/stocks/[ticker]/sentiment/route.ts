import { NextResponse } from "next/server";
import { communityService } from "@/domains/community/community.service";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const sentiment = await communityService.getStockSentiment(ticker);
    return NextResponse.json(sentiment);
  } catch (error) {
    return handleApiError(error, "get stock sentiment");
  }
}
