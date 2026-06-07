import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { faqService } from "@/domains/faq/faq.service";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    const tag = url.searchParams.get("tag") || undefined;
    const ticker = url.searchParams.get("ticker") || undefined;
    const cursor = url.searchParams.get("cursor") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

    if (q) {
      const items = await faqService.searchQuestions(q);
      return NextResponse.json({ data: items });
    }

    const result = await faqService.getPublishedQuestions({ category, tag, ticker, cursor, limit });
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "fetch FAQ");
  }
}
