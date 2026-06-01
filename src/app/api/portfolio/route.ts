import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { portfolioService } from "@/domains/portfolio/portfolio.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const [portfolio, isPublic] = await Promise.all([
      portfolioService.getPortfolio(user.id),
      portfolioService.getPrivacySetting(user.id),
    ]);
    return NextResponse.json({ data: { ...portfolio, isPublic } });
  } catch (error) {
    return handleApiError(error, "fetch portfolio");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ticker, buyPrice, quantity, buyDate, notes } = body;

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Ticker wajib diisi" }, { status: 400 });
    }
    if (!buyPrice || typeof buyPrice !== "number" || buyPrice <= 0) {
      return NextResponse.json({ error: "Harga beli harus angka positif" }, { status: 400 });
    }
    if (!quantity || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json({ error: "Jumlah lot harus angka positif" }, { status: 400 });
    }
    if (!buyDate || typeof buyDate !== "string") {
      return NextResponse.json({ error: "Tanggal beli wajib diisi" }, { status: 400 });
    }

    const holding = await portfolioService.addHolding(
      user.id,
      ticker.toUpperCase(),
      buyPrice,
      quantity * 100,
      buyDate,
      notes,
    );
    return NextResponse.json({ data: holding }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "add holding");
  }
}
