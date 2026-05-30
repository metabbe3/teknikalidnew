import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stockRepository } from "@/domains/stock/stock.repository";
import { computeChange, bigIntToNumber } from "@/lib/serialize";
import { decimalToNumber } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const stocks = await stockRepository.findActiveStocksWithPrices(undefined, false);

    const tickers = stocks.map((stock) => {
      const prices = stock.prices ?? [];
      const latest = prices[0];
      const prev = prices[1];
      const { close, change, changePercent } = computeChange(latest, prev);

      return {
        id: stock.id,
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        isActive: stock.isActive,
        latestPrice: close,
        change,
        changePercent,
        volume: latest ? bigIntToNumber(latest.volume) : null,
        lastUpdate: latest?.date?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ tickers });
  } catch (error) {
    return handleApiError(error, "fetch admin tickers");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const { ticker, isActive } = await request.json();

    if (!ticker || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "ticker and isActive required" }, { status: 400 });
    }

    const stock = await prisma.stock.update({
      where: { ticker },
      data: { isActive },
    });

    const { auditService } = await import("@/domains/audit/audit.service");
    await auditService.log(user.id, "admin:toggle_ticker", { ticker, isActive }, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());

    return NextResponse.json({ success: true, stock: { ticker: stock.ticker, isActive: stock.isActive } });
  } catch (error) {
    return handleApiError(error, "toggle stock active");
  }
}
