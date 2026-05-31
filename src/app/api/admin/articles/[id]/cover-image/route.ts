import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-error";
import { imageGenService } from "@/domains/image-gen/image-gen.service";
import { articleService } from "@/domains/article/article.service";
import { articleRepository } from "@/domains/article/article.repository";
import { ArticleNotFoundError } from "@/domains/article/article.errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const article = await articleRepository.findById(id);
    if (!article) throw new ArticleNotFoundError();

    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt as string | undefined;

    const { jobId } = await imageGenService.startGeneration(admin.id, {
      source: "manual",
      prompt: prompt || undefined,
      content: article.title,
      tickerTag: article.tickerTag,
    });

    // Poll for completion and attach to article
    waitForImageAndAttach(jobId, id, admin.id).catch(() => {});

    return NextResponse.json({ data: { jobId } }, { status: 202 });
  } catch (error) {
    return handleApiError(error, "generate cover image");
  }
}

async function waitForImageAndAttach(
  jobId: string,
  articleId: string,
  userId: string
) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const status = await imageGenService.getJobStatus(jobId, userId);
      if (status.status === "completed" && status.imageUrl) {
        await articleService.updateCoverImage(articleId, status.imageUrl);
        return;
      }
      if (status.status === "failed") return;
    } catch {
      return;
    }
  }
}
