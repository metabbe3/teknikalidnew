import { NextResponse } from "next/server";
import { stockRepository } from "@/domains/stock/stock.repository";
import { computeChange } from "@/lib/serialize";
import { handleApiError } from "@/lib/api-error";

export const revalidate = 300;

export async function GET() {
  try {
    const stock = await stockRepository.findStockByTicker("^JKSE");
    if (!stock) {
      return NextResponse.json({ data: null });
    }

    const prices = await stockRepository.findLatestPrices(stock.id, 2);
    const latest = prices[0];
    const prev = prices[1];
    const { close, prevClose, change, changePercent } = computeChange(latest, prev);

    return NextResponse.json({
      data: {
        close,
        prevClose,
        change,
        changePercent,
        date: latest?.date?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error, "fetch IHSG price");
  }
}
