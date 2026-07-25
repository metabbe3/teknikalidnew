import { NextResponse } from "next/server";
import { stockMarketService } from "@/domains/stock/stock-market.service";
import { stockRepository } from "@/domains/stock/stock.repository";
import { handleApiError } from "@/lib/api-error";
import { RANGE_KEYS, type DateRange } from "@/lib/constants";
import { z } from "zod";

export const revalidate = 300;

const stockCompareSchema = z.object({
  s: z.array(z.string().min(1).max(10).toUpperCase()).min(2).max(4),
  range: z.enum(RANGE_KEYS as [DateRange, ...DateRange[]]).default("6mo"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // NOTE: parseQuery() collapses repeated params (?s=A&s=B → s:"B"), so it
    // cannot validate array query params. Read them with getAll() and validate
    // the object directly.
    const parsed = stockCompareSchema.safeParse({
      s: searchParams.getAll("s"),
      range: searchParams.get("range") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const stocks = await stockRepository.findStocksByTickers(data.s);
    if (stocks.length !== data.s.length) {
      return NextResponse.json({ error: "Invalid ticker(s)" }, { status: 400 });
    }

    const result = await stockMarketService.getCompareData(
      stocks.map((s) => s.ticker),
      data.range,
    );
    return NextResponse.json({ stocks: result });
  } catch (error) {
    return handleApiError(error, "compare stocks");
  }
}
