import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { stockRepository } from "@/domains/stock/stock.repository";
import { marketEngine } from "@/lib/market-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const includeInactive = request.nextUrl.searchParams.get("all") === "1";

    const stocks = await stockRepository.findActiveStocksWithPrices(
      { assetClass: "EQUITY", includeInactive },
      false
    );

    const tickers = stocks.map((stock) => {
      const close = stock.close;
      const prevClose = stock.prevClose;
      const change = close !== null && prevClose !== null ? close - prevClose : null;
      const changePercent = close !== null && prevClose !== null ? marketEngine.pctChange(close, prevClose) : null;

      return {
        id: stock.id,
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        isActive: stock.isActive,
        latestPrice: close,
        change,
        changePercent,
        volume: stock.volume,
        lastUpdate: stock.date ? stock.date.toISOString() : null,
      };
    });

    const active = tickers.filter((t) => t.isActive).length;
    return NextResponse.json({
      tickers,
      summary: { total: tickers.length, active, inactive: tickers.length - active },
    });
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
