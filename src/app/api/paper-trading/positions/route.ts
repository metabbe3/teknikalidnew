import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const positions = await paperTradingService.getOpenPositions(user.id);
    return NextResponse.json({ data: positions });
  } catch (error) {
    return handleApiError(error, "mengambil posisi simulasi");
  }
}
