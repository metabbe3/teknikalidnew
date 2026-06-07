import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { faqService } from "@/domains/faq/faq.service";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 20);
    const data = await faqService.getTrending(limit);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch trending FAQ");
  }
}
