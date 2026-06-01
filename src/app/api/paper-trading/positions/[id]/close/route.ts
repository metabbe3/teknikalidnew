import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { paperTradingService } from "@/domains/paper-trading/paper-trading.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const result = await paperTradingService.closePosition(user.id, id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "menutup posisi simulasi");
  }
}
