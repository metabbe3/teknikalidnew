import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { articleService } from "@/domains/article/article.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const article = await articleService.updateArticle(id, {});
    return NextResponse.json({ data: article });
  } catch (error) {
    return handleApiError(error, "fetch article");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    if (body.action === "publish") {
      const article = await articleService.publishArticle(id);
      return NextResponse.json({ data: article });
    }
    if (body.action === "unpublish") {
      const article = await articleService.unpublishArticle(id);
      return NextResponse.json({ data: article });
    }

    const article = await articleService.updateArticle(id, {
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      tags: body.tags,
    });
    return NextResponse.json({ data: article });
  } catch (error) {
    return handleApiError(error, "update article");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await articleService.deleteArticle(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "delete article");
  }
}
