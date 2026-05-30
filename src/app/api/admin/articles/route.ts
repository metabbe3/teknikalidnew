import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleRepository } from "@/domains/article/article.repository";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "DRAFT" | "PUBLISHED" | null;
    const type = searchParams.get("type") as "STOCK_ANALYSIS" | "EDUCATIONAL" | "NEWS" | "GENERAL" | null;

    const articles = await articleRepository.findAllForAdmin({
      status: status ?? undefined,
      type: type ?? undefined,
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    return handleApiError(error, "fetch articles");
  }
}
