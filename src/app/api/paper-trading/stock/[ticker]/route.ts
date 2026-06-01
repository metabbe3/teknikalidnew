import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const user = await requireAuth();
    const { ticker } = await params;
    const position = await paperTradingService.getStockPosition(user.id, ticker);
    return NextResponse.json({ data: position });
  } catch (error) {
    return handleApiError(error, "mengambil posisi saham simulasi");
  }
}
