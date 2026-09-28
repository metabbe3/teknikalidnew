import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const articles = await prisma.article.findMany({
      where: {
        articleType: "NEWS",
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        slug: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    return NextResponse.json(articles);
  } catch (error) {
    return handleApiError(error, "fetch social-card articles");
  }
}
