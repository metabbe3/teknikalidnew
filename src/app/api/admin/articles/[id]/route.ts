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
    const user = await requireAdmin();
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

    // Validate before touching Prisma so VarChar overflow returns 400, not 500
    if (typeof body.title === "string" && body.title.length > 255) {
      return NextResponse.json({ error: "Title maksimal 255 karakter" }, { status: 400 });
    }
    if (typeof body.excerpt === "string" && body.excerpt.length > 500) {
      return NextResponse.json({ error: "Excerpt maksimal 500 karakter" }, { status: 400 });
    }
    let tickerTag: string | null | undefined;
    if ("tickerTag" in body) {
      const t = typeof body.tickerTag === "string" ? body.tickerTag.trim().toUpperCase() : "";
      if (t.length > 20) {
        return NextResponse.json({ error: "tickerTag maksimal 20 karakter" }, { status: 400 });
      }
      tickerTag = t === "" ? null : t;
    }
    const isListed = typeof body.isListed === "boolean" ? body.isListed : undefined;

    const before = await articleService.updateArticle(id, {});
    const article = await articleService.updateArticle(id, {
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      tags: body.tags,
      tickerTag,
      isListed,
    });

    const fields: string[] = [];
    if (body.title !== undefined && body.title !== before.title) fields.push("title");
    if (body.excerpt !== undefined && body.excerpt !== before.excerpt) fields.push("excerpt");
    if (body.content !== undefined && body.content !== before.content) fields.push("content");
    if (body.tags !== undefined && JSON.stringify(body.tags) !== JSON.stringify(before.tags)) fields.push("tags");
    if (tickerTag !== undefined && tickerTag !== before.tickerTag) fields.push("tickerTag");
    if (isListed !== undefined && isListed !== before.isListed) fields.push("isListed");

    const { auditService } = await import("@/domains/audit/audit.service");
    await auditService.log(user.id, "admin:edit_article", {
      id,
      slug: article.slug,
      fields,
      tickerTagBefore: before.tickerTag,
      tickerTagAfter: article.tickerTag,
      isListedBefore: before.isListed,
      isListedAfter: article.isListed,
    }, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());

    return NextResponse.json({ data: article });
  } catch (error) {
    return handleApiError(error, "update article");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    // Fetch for audit before delete — updateArticle(id, {}) is the established
    // read pattern in this route; deleteArticle re-checks the DRAFT-only guard.
    const article = await articleService.updateArticle(id, {});
    const { auditService } = await import("@/domains/audit/audit.service");
    await auditService.log(user.id, "admin:delete_article", {
      id,
      slug: article.slug,
      title: article.title,
    }, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
    await articleService.deleteArticle(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "delete article");
  }
}
