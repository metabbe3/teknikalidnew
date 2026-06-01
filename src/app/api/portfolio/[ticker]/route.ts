import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { portfolioService } from "@/domains/portfolio/portfolio.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const user = await requireAuth();
    const { ticker } = await params;
    const body = await request.json();
    const { buyPrice, quantity, buyDate, notes } = body;

    const holding = await portfolioService.updateHolding(user.id, ticker, {
      buyPrice: buyPrice !== undefined ? Number(buyPrice) : undefined,
      quantity: quantity !== undefined ? Number(quantity) * 100 : undefined,
      buyDate: buyDate !== undefined ? String(buyDate) : undefined,
      notes: notes !== undefined ? notes : undefined,
    });
    return NextResponse.json({ data: holding });
  } catch (error) {
    return handleApiError(error, "update holding");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const user = await requireAuth();
    const { ticker } = await params;

    await portfolioService.removeHolding(user.id, ticker);
    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    return handleApiError(error, "remove holding");
  }
}
