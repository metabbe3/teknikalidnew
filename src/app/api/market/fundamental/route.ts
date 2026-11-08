// SATU PINTU doctrine: endpoint publik untuk bot agentd (tool get_fundamental).
// Membaca baris StockFundamental terbaru + 4 kwartal terakhir untuk tren (0 seq scan).
// Header Cache-Control s-maxage=300, stale-while-revalidate=600.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockRepository } from "@/domains/stock/stock.repository";
import { handleApiError } from "@/lib/api-error";
import { decimalToNumber, bigIntToNumber } from "@/lib/serialize";
import type { Prisma } from "@/generated/prisma/client";

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

    const latest = await prisma.stockFundamental.findFirst({
      where: { stockId: stock.id },
      orderBy: { date: "desc" },
    });

    if (!latest) {
      return NextResponse.json(
        {
          ok: true,
          ticker: cleanTicker,
          asOf: null,
          fundamental: null,
          history: null,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    const quarterRows = await prisma.$queryRaw<
      Array<{
        date: Date;
        pe: Prisma.Decimal | null;
        pb: Prisma.Decimal | null;
        eps: Prisma.Decimal | null;
        dividendYield: Prisma.Decimal | null;
        marketCap: bigint | null;
      }>
    >`
      SELECT DISTINCT ON (DATE_TRUNC('quarter', date))
        date, pe, pb, eps, "dividendYield", "marketCap"
      FROM "StockFundamental"
      WHERE "stockId" = ${stock.id}
      ORDER BY DATE_TRUNC('quarter', date) DESC, date DESC
      LIMIT 4;
    `;

    const history =
      quarterRows.length > 0
        ? quarterRows
            .map((r) => ({
              date:
                r.date instanceof Date
                  ? r.date.toISOString().slice(0, 10)
                  : String(r.date).slice(0, 10),
              pe: decimalToNumber(r.pe),
              pb: decimalToNumber(r.pb),
              eps: decimalToNumber(r.eps),
              dividendYield: decimalToNumber(r.dividendYield),
              marketCap: bigIntToNumber(r.marketCap),
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : null;

    const fundamental = {
      pe: decimalToNumber(latest.pe),
      forwardPe: decimalToNumber(latest.forwardPe),
      pb: decimalToNumber(latest.pb),
      eps: decimalToNumber(latest.eps),
      dividendYield: decimalToNumber(latest.dividendYield),
      marketCap: bigIntToNumber(latest.marketCap),
      sharesOutstanding: bigIntToNumber(latest.sharesOutstanding),
      beta: decimalToNumber(latest.beta),
      bookValue: decimalToNumber(latest.bookValue),
      averageDailyVolume3Month: bigIntToNumber(latest.averageDailyVolume3Month),
    };

    const asOf =
      latest.date instanceof Date
        ? latest.date.toISOString().slice(0, 10)
        : String(latest.date).slice(0, 10);

    return NextResponse.json(
      {
        ok: true,
        ticker: cleanTicker,
        asOf,
        fundamental,
        history,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "fetch stock fundamental");
  }
}
