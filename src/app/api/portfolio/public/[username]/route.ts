import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { portfolioService } from "@/domains/portfolio/portfolio.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const data = await portfolioService.getPublicPortfolio(username);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, "fetch public portfolio");
  }
}
