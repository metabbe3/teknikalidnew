// SATU PINTU doctrine: endpoint publik untuk bot agentd (tool get_fundflow).
// Membaca aliran dana asing 5 sesi terakhir + akumulasi dari ForeignFlow + StockPrice (0 seq scan).
// Header Cache-Control s-maxage=300, stale-while-revalidate=600.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockRepository } from "@/domains/stock/stock.repository";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tickerParam = request.nextUrl.searchParams.get("ticker");
    if (!tickerParam || !tickerParam.trim()) {
      return NextResponse.json(
        { ok: false, error: "parameter ticker wajib diisi" },
        { status: 400 }
      );
    }

    const stock = await stockRepository.findStockByTicker(tickerParam.trim());
    if (!stock) {
      return NextResponse.json(
        { ok: false, error: "ticker tidak ditemukan" },
        { status: 404 }
      );
    }

    const cleanTicker = stock.ticker.replace(/\.JK$/i, "");

    const foreignRows = await prisma.foreignFlow.findMany({
      where: { stockId: stock.id },
      orderBy: { date: "desc" },
      take: 5,
    });

    const dates = foreignRows.map((f) => f.date);
    const priceRows =
      dates.length > 0
        ? await prisma.stockPrice.findMany({
            where: { stockId: stock.id, date: { in: dates } },
            select: { date: true, close: true },
          })
        : [];

    const pxByDate = new Map<string, number>();
    for (const p of priceRows) {
      const key =
        p.date instanceof Date
          ? p.date.toISOString().slice(0, 10)
          : String(p.date).slice(0, 10);
      if (p.close != null) {
        pxByDate.set(key, Number(p.close));
      }
    }

    const sessions = foreignRows.map((f) => {
      const dateStr =
        f.date instanceof Date
          ? f.date.toISOString().slice(0, 10)
          : String(f.date).slice(0, 10);
      const close = pxByDate.get(dateStr) ?? null;
      const netShares = Math.round(Number(f.foreignBuy) - Number(f.foreignSell));
      const netValue =
        close !== null && close !== 0 ? Math.round(netShares * close) : 0;
      return {
        date: dateStr,
        netShares,
        netValue,
      };
    });

    const cumulative5d = sessions.reduce(
      (acc, s) => {
        acc.shares += s.netShares;
        acc.value += s.netValue;
        return acc;
      },
      { shares: 0, value: 0 }
    );

    return NextResponse.json(
      {
        ok: true,
        ticker: cleanTicker,
        sessions,
        cumulative5d,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "fetch stock fundflow");
  }
}
