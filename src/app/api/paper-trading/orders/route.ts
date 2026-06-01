import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { stockTicker, side, orderType, quantity, targetPrice, positionId, reason, strategyTags, mood } = body;

    if (!stockTicker || !side || !orderType || !quantity) {
      return NextResponse.json({ error: "Data order tidak lengkap" }, { status: 400 });
    }

    const result = await paperTradingService.placeOrder(user.id, {
      stockTicker,
      side,
      orderType,
      quantity: Number(quantity),
      targetPrice: targetPrice ? Number(targetPrice) : undefined,
      positionId,
      reason: reason || null,
      strategyTags: strategyTags || null,
      mood: mood || null,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "membuat order simulasi");
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const orders = await paperTradingService.getPendingOrders(user.id);
    return NextResponse.json({ data: orders });
  } catch (error) {
    return handleApiError(error, "mengambil order simulasi");
  }
}
