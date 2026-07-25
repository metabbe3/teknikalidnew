import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { faqService } from "@/domains/faq/faq.service";
import { parseQuery, schemas } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const [data, error] = parseQuery(request.nextUrl.searchParams, schemas.faqTrending);
    if (error) return error;

    const result = await faqService.getTrending(data.limit);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, "fetch trending FAQ");
  }
}
