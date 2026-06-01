import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { stopLossPrice, takeProfitPrice } = body;

    const result = await paperTradingService.updatePosition(user.id, id, {
      stopLossPrice: stopLossPrice ?? null,
      takeProfitPrice: takeProfitPrice ?? null,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "mengupdate posisi simulasi");
  }
}
