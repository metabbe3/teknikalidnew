import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleContent, extractHeadings, estimateReadingTime } from "@/components/article/article-renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { ArrowLeft, Eye, Clock, CheckCircle2, Edit3 } from "lucide-react";

export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, username: true, image: true } },
    },
  });

  if (!article) notFound();

  const headings = extractHeadings(article.content);
  const readingTime = estimateReadingTime(article.content);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Admin preview bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                article.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-700 text-[10px]"
                  : "bg-amber-100 text-amber-700 text-[10px]"
              }
            >
              {article.status === "PUBLISHED" ? "Published" : "Draft"}
            </Badge>
            <span className="text-xs text-gray-400">
              {article.aiProvider && `via ${article.aiProvider}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/articles">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <ArrowLeft className="h-3 w-3" />
                Back
              </Button>
            </Link>
            {article.status === "DRAFT" && (
              <form action={async () => {
                "use server";
                const { articleService } = await import("@/domains/article/article.service");
                await articleService.publishArticle(id);
              }}>
                <Button type="submit" size="sm" className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Publish
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Article content — mirrors akademi/[slug] layout */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-5">
            {article.title}
          </h1>
          {article.coverImageUrl && (
            <div className="rounded-xl overflow-hidden mb-6">
              <img
                src={article.coverImageUrl}
                alt=""
                className="w-full object-cover max-h-[400px]"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                {(article.author.name ?? article.author.username)[0].toUpperCase()}
              </div>
              <span className="text-text-secondary font-medium">
                {article.author.name ?? article.author.username}
              </span>
            </div>
            <span className="font-mono text-xs">
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(article.publishedAt))}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs">
              <Clock className="h-3 w-3" />
              {readingTime} menit baca
            </span>
          </div>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {article.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-accent-muted text-accent border-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <ArticleContent content={article.content} />

        {/* TOC sidebar */}
        {headings.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
              Daftar Isi
            </p>
            <nav className="columns-2 gap-4 space-y-0.5">
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className="block text-xs text-text-secondary hover:text-accent transition-colors truncate"
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
