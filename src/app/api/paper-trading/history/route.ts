import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;

    const result = await paperTradingService.getTradeHistory(user.id, cursor);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "mengambil riwayat simulasi");
  }
}
