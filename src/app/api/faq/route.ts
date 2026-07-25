import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { faqService } from "@/domains/faq/faq.service";
import { parseQuery, schemas } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.faqList);
    if (error) return error;

    if (data.q) {
      const items = await faqService.searchQuestions(data.q);
      return NextResponse.json({ data: items });
    }

    const result = await faqService.getPublishedQuestions({ category: data.category, tag: data.tag, ticker: data.ticker, cursor: data.cursor, limit: data.limit });
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "fetch FAQ");
  }
}
