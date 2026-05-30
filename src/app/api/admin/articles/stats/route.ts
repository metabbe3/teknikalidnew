import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleRepository } from "@/domains/article/article.repository";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await articleRepository.getStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    return handleApiError(error, "fetch article stats");
  }
}
