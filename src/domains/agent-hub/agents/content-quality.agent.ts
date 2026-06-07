import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import type { AutoFixRecord } from "../auto-fix.types";
import { prisma } from "@/lib/prisma";

interface ArticleData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  status: string;
  articleType: string;
  createdAt: Date;
}

interface ReviewIssue {
  type: string;
  severity: string;
  message: string;
  suggestion: string;
}

interface ReviewResult {
  articleId: string;
  articleTitle: string;
  score: number;
  approved: boolean;
  issues: ReviewIssue[];
  overallNote: string;
}

export class ContentQualityAgent extends BaseAgent {
  readonly type: AgentType = "content_quality";
  readonly label = "Content Quality";

  async execute(payload: AgentJobPayload): Promise<AgentJobResult> {
    const articleId = payload.articleId as string | undefined;

    const article = articleId
      ? await this.getArticle(articleId)
      : await this.getLatestUnreviewedArticle();

    if (!article) {
      return {
        summary: "No articles to review",
        reviewed: 0,
        results: [],
      };
    }

    const config = await this.getAgentConfig();
    const reviewResult = await this.reviewArticle(article);
    const autoFixes: AutoFixRecord[] = [];

    // Auto-fix phase: fix issues if enabled and score < 70
    const autoFixConfig = config?.autoFix as Record<string, unknown> | undefined;
    if (autoFixConfig?.enabled !== false && reviewResult.score < 70) {
      const fixResults = await this.autoFixArticle(article, reviewResult.issues, autoFixConfig);
      autoFixes.push(...fixResults.fixes);

      // Re-score after fixes if any were applied
      if (fixResults.fixes.some((f) => f.applied)) {
        const updatedArticle = { ...article };
        for (const fix of fixResults.fixes) {
          if (fix.applied) {
            if (fix.field === "content") updatedArticle.content = fix.after;
            if (fix.field === "title") updatedArticle.title = fix.after;
          }
        }
        // Re-review with updated content
        const reReview = await this.reviewArticle(updatedArticle);
        reviewResult.score = reReview.score;
        reviewResult.issues = reReview.issues;
        reviewResult.overallNote = reReview.overallNote;
      }
    }

    // Auto-publish or auto-reject based on final score
    const publishThreshold = (config?.autoPublishThreshold as number) ?? 70;
    const rejectThreshold = (config?.autoRejectThreshold as number) ?? 40;

    if (reviewResult.score >= publishThreshold && article.status === "DRAFT") {
      await prisma.article.update({
        where: { id: article.id },
        data: { status: "PUBLISHED" },
      });
    } else if (reviewResult.score < rejectThreshold) {
      await prisma.article.update({
        where: { id: article.id },
        data: { isListed: false },
      });
    }

    const appliedFixes = autoFixes.filter((f) => f.applied).length;

    return {
      summary: `Reviewed 1 article. Score: ${reviewResult.score}/100. ${appliedFixes > 0 ? `Applied ${appliedFixes} fixes. ` : ""}${reviewResult.score >= publishThreshold ? "Approved" : reviewResult.score < rejectThreshold ? "Rejected (unlisted)" : "Needs review"}.`,
      reviewed: 1,
      results: [reviewResult],
      autoFixes,
      reviewedAt: new Date().toISOString(),
    };
  }

  private async getArticle(id: string): Promise<ArticleData | null> {
    return prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        tags: true,
        status: true,
        articleType: true,
        createdAt: true,
      },
    });
  }

  private async getLatestUnreviewedArticle(): Promise<ArticleData | null> {
    return prisma.article.findFirst({
      where: { status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        tags: true,
        status: true,
        articleType: true,
        createdAt: true,
      },
    });
  }

  private async reviewArticle(article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    tags: string[];
    status: string;
    articleType: string;
    createdAt: Date;
  }): Promise<ReviewResult> {
    const truncatedBody = article.content.slice(0, 3000);

    const system = `Kamu adalah editor dan quality assurance untuk TeknikalID — platform analisa teknikal saham Indonesia.
Kamu mengecek kualitas artikel saham berbahasa Indonesia.

Cek hal berikut:
1. Akurasi faktual — apakah angka-angka yang disebutkan masuk akal untuk saham IDX
2. Readability — apakah bahasa Indonesia-nya natural, bukan terjemahan kaku
3. Grammar — kesalahan tata bahasa, typo
4. Clickbait detection — apakah judul terlalu sensasional/menyesatkan
5. Struktur — apakah ada introduction, body, conclusion yang jelas
6. Konten duplikat — apakah ada kalimat berulang

Respond ONLY with valid JSON. No other text.`;

    const user = `Review artikel berikut:

Title: "${article.title}"
Excerpt: "${article.excerpt.slice(0, 200)}"
Tags: ${article.tags.join(", ") || "none"}
Type: ${article.articleType}
Status: ${article.status}
Created: ${article.createdAt.toISOString()}

Content (first 3000 chars):
${truncatedBody}

Output JSON:
{
  "score": 0-100,
  "issues": [
    {
      "type": "factual" | "readability" | "grammar" | "clickbait" | "structure" | "duplicate",
      "severity": "critical" | "warning" | "info",
      "message": "deskripsi masalah dalam bahasa Indonesia",
      "suggestion": "saran perbaikan"
    }
  ],
  "overallNote": "catatan singkat tentang kualitas artikel"
}`;

    const response = await this.callAI(system, user, 2000);

    const parsed = this.parseJsonResponse(response);
    const score = typeof parsed?.["score"] === "number" ? parsed["score"] : 50;
    const issues = Array.isArray(parsed?.["issues"])
      ? (parsed["issues"] as Array<Record<string, unknown>>).map((issue) => ({
          type: String(issue.type ?? "unknown"),
          severity: String(issue.severity ?? "info"),
          message: String(issue.message ?? ""),
          suggestion: String(issue.suggestion ?? ""),
        }))
      : [];

    return {
      articleId: article.id,
      articleTitle: article.title,
      score,
      approved: score >= 70,
      issues,
      overallNote: typeof parsed?.["overallNote"] === "string" ? parsed["overallNote"] : "",
    };
  }

  // ── Auto-fix methods ────────────────────────────────────────────────

  private async autoFixArticle(
    article: ArticleData,
    issues: ReviewIssue[],
    config?: Record<string, unknown>,
  ): Promise<{ fixes: AutoFixRecord[] }> {
    const fixes: AutoFixRecord[] = [];
    let currentContent = article.content;
    let currentTitle = article.title;

    for (const issue of issues) {
      if (issue.severity === "info") continue; // skip info-level

      // Grammar / readability fix
      if ((issue.type === "grammar" || issue.type === "readability") && config?.grammar !== false) {
        const fix = await this.fixGrammar(article.id, currentTitle, currentContent);
        fixes.push(fix);
        if (fix.applied) currentContent = fix.after;
      }

      // Clickbait title fix
      if (issue.type === "clickbait" && config?.clickbait !== false) {
        const fix = await this.fixClickbaitTitle(article.id, currentTitle, currentContent);
        fixes.push(fix);
        if (fix.applied) currentTitle = fix.after;
      }

      // Structure fix (missing intro/conclusion)
      if (issue.type === "structure" && config?.structure !== false) {
        const fix = await this.fixStructure(article.id, currentContent, issue);
        fixes.push(fix);
        if (fix.applied) currentContent = fix.after;
      }

      // Duplicate content removal
      if (issue.type === "duplicate" && config?.duplicate !== false) {
        const fix = this.fixDuplicates(article.id, currentContent);
        fixes.push(fix);
        if (fix.applied) currentContent = fix.after;
      }
    }

    return { fixes };
  }

  private async fixGrammar(
    articleId: string,
    title: string,
    content: string,
  ): Promise<AutoFixRecord> {
    const before = content;
    try {
      const system = `Kamu adalah editor bahasa Indonesia untuk platform analisis saham.
Perbaiki kesalahan grammar, typo, dan readability pada teks berikut.
Pertahankan makna dan struktur yang sama. Jangan tambah atau hapus konten.
Hanya perbaiki kesalahan bahasa. Respond with ONLY the corrected text.`;

      const user = `Judul: "${title}"

Konten:
${content.slice(0, 4000)}`;

      const result = await this.callAI(system, user, 4000);
      const cleaned = result.trim();

      if (!cleaned || cleaned === content.slice(0, cleaned.length)) {
        return {
          type: "grammar_rewrite",
          field: "content",
          before: this.truncateForAudit(before),
          after: "",
          applied: false,
          reason: "No changes needed or AI returned empty",
        };
      }

      await prisma.article.update({
        where: { id: articleId },
        data: { content: cleaned },
      });

      return {
        type: "grammar_rewrite",
        field: "content",
        before: this.truncateForAudit(before),
        after: this.truncateForAudit(cleaned),
        applied: true,
      };
    } catch (err) {
      return {
        type: "grammar_rewrite",
        field: "content",
        before: this.truncateForAudit(before),
        after: "",
        applied: false,
        reason: err instanceof Error ? err.message : "Failed",
      };
    }
  }

  private async fixClickbaitTitle(
    articleId: string,
    currentTitle: string,
    content: string,
  ): Promise<AutoFixRecord> {
    const before = currentTitle;
    try {
      const system = `Kamu adalah editor untuk platform analisis saham Indonesia.
Tulis ulang judul clickbait/sensasional menjadi judul faktual dan informatif.
Maksimal 80 karakter. Mengandung keyword utama.
Respond with ONLY the new title text, no quotes, no explanation.`;

      const user = `Judul clickbait: "${currentTitle}"
Konten preview: ${content.slice(0, 500)}`;

      const result = await this.callAI(system, user, 200);
      const newTitle = result.trim().replace(/^["']|["']$/g, "").slice(0, 255);

      if (!newTitle || newTitle === currentTitle || newTitle.length < 10) {
        return {
          type: "clickbait_title",
          field: "title",
          before,
          after: "",
          applied: false,
          reason: "Generated title was empty or identical",
        };
      }

      await prisma.article.update({
        where: { id: articleId },
        data: { title: newTitle },
      });

      return {
        type: "clickbait_title",
        field: "title",
        before,
        after: newTitle,
        applied: true,
      };
    } catch (err) {
      return {
        type: "clickbait_title",
        field: "title",
        before,
        after: "",
        applied: false,
        reason: err instanceof Error ? err.message : "Failed",
      };
    }
  }

  private async fixStructure(
    articleId: string,
    content: string,
    issue: ReviewIssue,
  ): Promise<AutoFixRecord> {
    const before = content;
    try {
      const needsIntro = /intro|pengantar|pembuka/i.test(issue.message);
      const needsConclusion = /conclusion|kesimpulan|penutup/i.test(issue.message);

      let system: string;
      let user: string;

      if (needsIntro) {
        system = `Kamu adalah penulis analisis saham Indonesia.
Tulis paragraf pembuka (intro) singkat untuk artikel ini. 2-3 kalimat. Bahasa Indonesia formal tapi mudah dibaca.
Respond with ONLY the intro paragraph text.`;
        user = `Konten artikel:\n${content.slice(0, 800)}`;
      } else if (needsConclusion) {
        system = `Kamu adalah penulis analisis saham Indonesia.
Tulis paragraf kesimpulan singkat untuk artikel ini. 2-3 kalimat. Bahasa Indonesia formal tapi mudah dibaca.
Respond with ONLY the conclusion paragraph text.`;
        user = `Konten artikel:\n${content.slice(0, 800)}`;
      } else {
        // General structure fix: add H2 headings to flat text
        system = `Kamu adalah penulis analisis saham Indonesia.
Tambahkan heading H2 (##) pada posisi yang tepat untuk memperbaiki struktur artikel.
Jangan ubah konten, hanya tambahkan heading di antara paragraf yang sesuai.
Respond with ONLY the full content with added headings.`;
        user = content.slice(0, 4000);
      }

      const result = await this.callAI(system, user, 2000);
      const newContent = result.trim();

      if (!newContent || newContent.length < content.length * 0.8) {
        return {
          type: "structure_fix",
          field: "content",
          before: this.truncateForAudit(before),
          after: "",
          applied: false,
          reason: "Generated content too short or empty",
        };
      }

      let finalContent: string;
      if (needsIntro) {
        finalContent = newContent + "\n\n" + content;
      } else if (needsConclusion) {
        finalContent = content + "\n\n" + newContent;
      } else {
        finalContent = newContent;
      }

      await prisma.article.update({
        where: { id: articleId },
        data: { content: finalContent },
      });

      return {
        type: "structure_fix",
        field: "content",
        before: this.truncateForAudit(before),
        after: this.truncateForAudit(finalContent),
        applied: true,
      };
    } catch (err) {
      return {
        type: "structure_fix",
        field: "content",
        before: this.truncateForAudit(before),
        after: "",
        applied: false,
        reason: err instanceof Error ? err.message : "Failed",
      };
    }
  }

  private fixDuplicates(articleId: string, content: string): AutoFixRecord {
    const before = content;
    const paragraphs = content.split(/\n\n+/);
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const para of paragraphs) {
      const normalized = para.trim().toLowerCase().replace(/\s+/g, " ");
      // Skip if very similar to an existing paragraph (>80% overlap)
      let isDuplicate = false;
      if (normalized.length > 30) {
        for (const existing of seen) {
          const overlap = this.stringSimilarity(normalized, existing);
          if (overlap > 0.8) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate && para.trim()) {
        seen.add(normalized);
        deduped.push(para);
      }
    }

    const newContent = deduped.join("\n\n");

    if (newContent.length >= content.length * 0.95) {
      return {
        type: "duplicate_removal",
        field: "content",
        before: this.truncateForAudit(before),
        after: "",
        applied: false,
        reason: "No significant duplicates found",
      };
    }

    // Fire-and-forget update (sync is fine for dedup)
    prisma.article.update({
      where: { id: articleId },
      data: { content: newContent },
    }).catch(() => { /* silent */ });

    return {
      type: "duplicate_removal",
      field: "content",
      before: this.truncateForAudit(before),
      after: this.truncateForAudit(newContent),
      applied: true,
    };
  }

  /** Simple Jaccard-like word overlap similarity (0-1) */
  private stringSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(" "));
    const wordsB = new Set(b.split(" "));
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
