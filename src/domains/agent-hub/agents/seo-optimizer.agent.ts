import { BaseAgent } from "./base-agent";
import type { AgentType, AgentJobPayload, AgentJobResult } from "../agent-hub.types";
import type { AutoFixRecord } from "../auto-fix.types";
import { prisma } from "@/lib/prisma";

export class SeoOptimizerAgent extends BaseAgent {
  readonly type: AgentType = "seo_optimizer";
  readonly label = "SEO Optimizer";

  protected getDefaultSystemPrompt(): string {
    return `Kamu adalah SEO expert untuk TeknikalID — platform analisa teknikal saham Indonesia (teknikalid.com).
Analisis artikel-artikel ini dari sudut pandang SEO. Cek:
1. Panjang dan kualitas title (idealnya 40-60 karakter). Title > 60 karakter akan terpotong di Google SERP — flag sebagai "critical". Title < 30 karakter juga "critical".
2. Kualitas excerpt/meta description (idealnya 120-160 karakter). Excerpt yang terpotong di tengah kalimat, mengandung markdown, atau karakter aneh — flag sebagai "critical".
3. Panjang konten (idealnya > 1000 karakter)
4. Tags/keywords. Tags yang mengandung tanda hubung (seperti "pasar-saham") atau terlalu generik (seperti "berita") adalah BURUK — flag sebagai "critical". Tags yang baik: satu kata atau frasa pendek tanpa hyphen.
5. Struktur heading (apakah ada H2, H3)

Respond ONLY with valid JSON array. No other text.`;
  }

  async execute(_payload: AgentJobPayload): Promise<AgentJobResult> {
    const agentConfig = await this.getAgentConfig();
    const autoApply = agentConfig?.autoApply !== false; // default true
    const fixConfig = (agentConfig?.fixes as Record<string, boolean>) ?? {};

    // Fetch all published articles from today + DRAFT articles that haven't been reviewed
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { status: "PUBLISHED", createdAt: { gte: today } },
          { status: "DRAFT" },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        tags: true,
        createdAt: true,
        content: true,
      },
    });

    if (articles.length === 0) {
      return {
        summary: "No articles to analyze",
        articlesAnalyzed: 0,
        issues: [],
        applied: [],
      };
    }

    const allIssues: Array<{
      articleId: string;
      articleTitle: string;
      issues: Array<{ type: string; severity: string; message: string; suggestion: string }>;
    }> = [];

    const applied: AutoFixRecord[] = [];

    // Analyze in batches of 10
    for (let i = 0; i < articles.length; i += 10) {
      const batch = articles.slice(i, i + 10);
      const batchIssues = await this.analyzeBatch(batch);
      allIssues.push(...batchIssues);
    }

    // Auto-apply fixes (critical always, warning if enabled in config)
    if (autoApply) {
      for (const articleIssues of allIssues) {
        const article = articles.find((a) => a.id === articleIssues.articleId);
        if (!article) continue;

        for (const issue of articleIssues.issues) {
          const isCritical = issue.severity === "critical";
          const shouldFixWarning = this.shouldFixWarning(issue.type, fixConfig);

          if (isCritical || shouldFixWarning) {
            const fix = await this.applyFix(article, issue);
            if (fix) applied.push(fix);
          }
        }
      }
    }

    const totalIssues = allIssues.reduce((sum, a) => sum + a.issues.length, 0);
    const criticalIssues = allIssues.reduce(
      (sum, a) => sum + a.issues.filter((i) => i.severity === "critical").length,
      0,
    );

    return {
      summary: `Analyzed ${articles.length} articles. Found ${totalIssues} issues (${criticalIssues} critical). Applied ${applied.length} fixes.`,
      articlesAnalyzed: articles.length,
      totalIssues,
      criticalIssues,
      issues: allIssues,
      applied,
      autoApplied: applied.length,
      analyzedAt: new Date().toISOString(),
    };
  }

  /** Check if a warning-level issue type should be fixed based on granular config */
  private shouldFixWarning(issueType: string, fixConfig: Record<string, boolean>): boolean {
    switch (issueType) {
      case "title_length":
        return fixConfig.titleLength !== false; // critical, always fix
      case "meta_description":
        return fixConfig.metaDescription !== false;
      case "tags":
        return fixConfig.tags !== false;
      case "title_optimization":
        return fixConfig.titleOptimization === true; // opt-in
      case "tag_enrichment":
        return fixConfig.tagEnrichment === true; // opt-in
      case "heading_structure":
        return fixConfig.headingStructure === true; // opt-in
      default:
        return false;
    }
  }

  private async analyzeBatch(
    articles: Array<{
      id: string;
      title: string;
      slug: string;
      excerpt: string;
      tags: string[];
      createdAt: Date;
      content: string;
    }>,
  ) {
    const articlesData = articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt.slice(0, 150),
      tags: a.tags,
      contentLength: a.content.length,
      hasExcerpt: a.excerpt.length > 20,
      titleLength: a.title.length,
    }));

    const system = await this.getSystemPrompt();

    const user = `Analisis SEO untuk ${articles.length} artikel berikut:

${articlesData.map((a) => `ID: ${a.id}
Title: "${a.title}" (${a.titleLength} chars)
Slug: ${a.slug}
Excerpt: "${a.excerpt}" (${a.hasExcerpt ? "ada" : "MISSING"})
Tags: ${a.tags.join(", ") || "none"}
Content Length: ${a.contentLength} chars
`).join("\n---\n")}

Format output JSON array:
[
  {
    "articleId": "...",
    "issues": [
      {
        "type": "title_length" | "meta_description" | "content_length" | "tags" | "heading_structure" | "title_optimization" | "tag_enrichment",
        "severity": "critical" | "warning" | "info",
        "message": "deskripsi masalah",
        "suggestion": "saran perbaikan"
      }
    ]
  }
]

Hanya masukkan artikel yang punya issues. Jika artikel sudah OK, skip.
Gunakan severity "critical" untuk masalah yang wajib diperbaiki (missing title, no tags, dll).
Gunakan severity "warning" untuk masalah yang bisa diperbaiki tapi tidak kritis (title bisa lebih SEO-friendly, tags bisa ditambah, dll).
Gunakan type "title_optimization" untuk title yang sudah OK tapi bisa lebih keyword-rich.
Gunakan type "tag_enrichment" untuk tags yang sudah ada tapi bisa ditambah.`;

    const response = await this.callAI(system, user, 4000);

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((item: Record<string, unknown>) => ({
            articleId: String(item.articleId ?? ""),
            articleTitle: articlesData.find((a) => a.id === item.articleId)?.title ?? "Unknown",
            issues: Array.isArray(item.issues)
              ? item.issues.map((issue: Record<string, unknown>) => ({
                  type: String(issue.type ?? "unknown"),
                  severity: String(issue.severity ?? "info"),
                  message: String(issue.message ?? ""),
                  suggestion: String(issue.suggestion ?? ""),
                }))
              : [],
          }));
        }
      }
    } catch {
      // Fallback: return empty issues for this batch
    }

    return [];
  }

  private async applyFix(
    article: {
      id: string;
      title: string;
      excerpt: string;
      tags: string[];
      content: string;
    },
    issue: { type: string; severity: string; message: string; suggestion: string },
  ): Promise<AutoFixRecord | null> {
    try {
      // Title too short or missing (critical)
      if (issue.type === "title_length" && article.title.length < 30) {
        const newTitle = await this.generateSeoTitle(article.content, article.title);
        if (newTitle && newTitle.length > article.title.length) {
          await prisma.article.update({
            where: { id: article.id },
            data: { title: newTitle },
          });
          return { type: "title_fix", field: "title", before: article.title, after: newTitle, applied: true };
        }
      }

      // Title too long — shorten to fit SERP (critical)
      if (issue.type === "title_length" && article.title.length > 60) {
        const newTitle = await this.shortenSeoTitle(article.content, article.title);
        if (newTitle && newTitle.length <= 60) {
          await prisma.article.update({
            where: { id: article.id },
            data: { title: newTitle },
          });
          return { type: "title_shortened", field: "title", before: article.title, after: newTitle, applied: true };
        }
      }

      // Title optimization (warning-level) — make it more SEO-friendly
      if (issue.type === "title_optimization") {
        const newTitle = await this.optimizeSeoTitle(article.content, article.title);
        if (newTitle && newTitle !== article.title) {
          await prisma.article.update({
            where: { id: article.id },
            data: { title: newTitle },
          });
          return { type: "title_optimization", field: "title", before: article.title, after: newTitle, applied: true };
        }
      }

      // Excerpt too short or missing (critical)
      if (issue.type === "meta_description" && article.excerpt.length < 50) {
        const newExcerpt = await this.generateSeoExcerpt(article.content);
        if (newExcerpt && newExcerpt.length > article.excerpt.length) {
          await prisma.article.update({
            where: { id: article.id },
            data: { excerpt: newExcerpt },
          });
          return { type: "excerpt_fix", field: "excerpt", before: article.excerpt, after: newExcerpt, applied: true };
        }
      }

      // Bad excerpt — malformed, truncated, or contains markdown (critical)
      if (issue.type === "meta_description" && article.excerpt.length >= 50 && this.isBadExcerpt(article.excerpt)) {
        const newExcerpt = await this.fixBadExcerpt(article.content, article.excerpt);
        if (newExcerpt) {
          await prisma.article.update({
            where: { id: article.id },
            data: { excerpt: newExcerpt },
          });
          return { type: "excerpt_fix", field: "excerpt", before: this.truncateForAudit(article.excerpt, 200), after: this.truncateForAudit(newExcerpt, 200), applied: true };
        }
      }

      // No tags (critical)
      if (issue.type === "tags" && article.tags.length === 0) {
        const newTags = await this.generateSeoTags(article.content, article.title);
        if (newTags && newTags.length > 0) {
          await prisma.article.update({
            where: { id: article.id },
            data: { tags: newTags },
          });
          return { type: "tags_fix", field: "tags", before: "none", after: newTags.join(", "), applied: true };
        }
      }

      // Bad tags — poorly formatted, slug-like, or too generic (critical)
      if (issue.type === "tags" && article.tags.length > 0 && this.hasBadTags(article.tags)) {
        const newTags = await this.fixBadTags(article.content, article.title, article.tags);
        if (newTags && newTags.length > 0) {
          await prisma.article.update({
            where: { id: article.id },
            data: { tags: newTags },
          });
          return { type: "tags_fix", field: "tags", before: article.tags.join(", "), after: newTags.join(", "), applied: true };
        }
      }

      // Tag enrichment (warning-level) — add missing relevant tags
      if (issue.type === "tag_enrichment" && article.tags.length > 0) {
        const extraTags = await this.suggestExtraTags(article.content, article.title, article.tags);
        if (extraTags && extraTags.length > 0) {
          const merged = [...new Set([...article.tags, ...extraTags])];
          await prisma.article.update({
            where: { id: article.id },
            data: { tags: merged },
          });
          return { type: "tag_enrichment", field: "tags", before: article.tags.join(", "), after: merged.join(", "), applied: true };
        }
      }

      // Heading structure (warning-level) — add H2/H3 markers to flat text
      if (issue.type === "heading_structure") {
        const newContent = await this.addHeadings(article.content);
        if (newContent && newContent !== article.content) {
          await prisma.article.update({
            where: { id: article.id },
            data: { content: newContent },
          });
          return {
            type: "heading_structure",
            field: "content",
            before: this.truncateForAudit(article.content, 200),
            after: this.truncateForAudit(newContent, 200),
            applied: true,
          };
        }
      }
    } catch {
      // Silently fail — don't block the whole job
    }

    return null;
  }

  private async generateSeoTitle(content: string, currentTitle: string): Promise<string | null> {
    const system = "Generate a concise, SEO-optimized article title in Indonesian for a stock analysis platform. 40-60 characters. Respond with ONLY the title text, no quotes, no explanation.";
    const user = `Current title: "${currentTitle}"\nContent preview: ${content.slice(0, 500)}`;
    const result = await this.callAI(system, user, 200);
    return result.trim().replace(/^["']|["']$/g, "").slice(0, 255) || null;
  }

  private async optimizeSeoTitle(content: string, currentTitle: string): Promise<string | null> {
    const system = `Optimalkan judul artikel berikut untuk SEO tanpa mengubah makna. Tambahkan keyword yang relevan. 40-60 karakter ideal.
Respond with ONLY the optimized title text, no quotes, no explanation. If the title is already good, respond with the same title.`;
    const user = `Current title: "${currentTitle}"\nContent preview: ${content.slice(0, 500)}`;
    const result = await this.callAI(system, user, 200);
    const optimized = result.trim().replace(/^["']|["']$/g, "").slice(0, 255);
    return optimized && optimized !== currentTitle ? optimized : null;
  }

  private async generateSeoExcerpt(content: string): Promise<string | null> {
    const system = "Generate a meta description/excerpt in Indonesian for this stock analysis article. 120-160 characters. Respond with ONLY the excerpt text, no quotes, no explanation.";
    const user = `Content preview: ${content.slice(0, 800)}`;
    const result = await this.callAI(system, user, 200);
    return result.trim().replace(/^["']|["']$/g, "").slice(0, 500) || null;
  }

  private async generateSeoTags(content: string, title: string): Promise<string[] | null> {
    const system = `Generate 3-5 relevant SEO tags/keywords in Indonesian for this stock analysis article.
Tags should be lowercase, no spaces (use hyphens if needed).
Respond ONLY with a JSON array of strings, e.g. ["saham", "idx", "analisis-teknikal"]`;
    const user = `Title: "${title}"\nContent preview: ${content.slice(0, 500)}`;
    const result = await this.callAI(system, user, 200);

    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((t): t is string => typeof t === "string").slice(0, 5);
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async suggestExtraTags(
    content: string,
    title: string,
    existingTags: string[],
  ): Promise<string[] | null> {
    const system = `Berikan 1-3 tag/keyword tambahan yang relevan untuk artikel ini. Tag harus lowercase, tanpa spasi.
Jangan ulang tag yang sudah ada. Respond ONLY with a JSON array of strings.`;
    const user = `Title: "${title}"\nExisting tags: ${existingTags.join(", ")}\nContent preview: ${content.slice(0, 500)}`;
    const result = await this.callAI(system, user, 200);

    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          const newTags = parsed.filter((t): t is string => typeof t === "string" && !existingTags.includes(t));
          return newTags.slice(0, 3);
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async addHeadings(content: string): Promise<string | null> {
    const system = `Tambahkan heading H2 (##) pada posisi yang tepat dalam artikel berikut untuk memperbaiki struktur SEO.
JANGAN ubah konten teks. Hanya tambahkan ## di antara paragraf yang sesuai.
Respond with ONLY the full content with added headings.`;
    const user = content.slice(0, 4000);
    const result = await this.callAI(system, user, 4000);
    const withHeadings = result.trim();

    // Only apply if result is reasonably similar in length (not a full rewrite)
    if (!withHeadings || withHeadings.length < content.length * 0.8) return null;
    if (withHeadings === content) return null; // no changes made

    return withHeadings;
  }

  // ── New fix methods for long titles, bad excerpts, bad tags ──

  private async shortenSeoTitle(content: string, currentTitle: string): Promise<string | null> {
    const system = `Pendekkan judul artikel berikut menjadi 40-60 karakter untuk SEO. Tetap pertahankan keyword utama dan makna aslinya.
Jangan tambahkan kata-kata yang tidak perlu. Judul harus tetap menarik dan clickable.
Respond with ONLY the shortened title text, no quotes, no explanation.`;
    const user = `Current title (${currentTitle.length} chars): "${currentTitle}"\nContent preview: ${content.slice(0, 500)}`;
    const result = await this.callAI(system, user, 200);
    const shortened = result.trim().replace(/^["']|["']$/g, "").slice(0, 255);
    if (!shortened || shortened === currentTitle) return null;
    if (shortened.length >= currentTitle.length || shortened.length > 60) return null;
    return shortened;
  }

  private async fixBadExcerpt(content: string, currentExcerpt: string): Promise<string | null> {
    const system = `Perbaiki excerpt/meta description artikel berikut. Excerpt saat ini bermasalah (terpotong, mengandung markdown, atau karakter aneh).
Buat meta description yang bersih, 120-160 karakter, dalam bahasa Indonesia, SEO-friendly.
Respond with ONLY the excerpt text, no quotes, no explanation.`;
    const user = `Bad excerpt: "${currentExcerpt}"\nContent preview: ${content.slice(0, 800)}`;
    const result = await this.callAI(system, user, 200);
    const fixed = result.trim().replace(/^["']|["']$/g, "").slice(0, 500);
    if (!fixed || fixed === currentExcerpt) return null;
    return fixed;
  }

  private async fixBadTags(
    content: string,
    title: string,
    currentTags: string[],
  ): Promise<string[] | null> {
    const system = `Tag/keyword artikel ini bermasalah (mengandung tanda hubung, format yang salah, atau tidak relevan).
Ganti dengan 3-5 keyword SEO yang relevan dalam bahasa Indonesia.
Tag harus lowercase, SATU KATA atau frasa pendek TANPA tanda hubung/strip.
Contoh tag yang BAIK: "saham", "idx", "analisis teknikal", "ihsg", "bbc"
Contoh tag yang BURUK: "pasar-saham", "berita", "harga-saham-bbca"
Respond ONLY with a JSON array of strings.`;
    const user = `Title: "${title}"\nCurrent bad tags: ${currentTags.join(", ")}\nContent preview: ${content.slice(0, 500)}`;
    const result = await this.callAI(system, user, 200);

    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.toLowerCase().trim())
            .filter((t) => t.length > 0)
            .slice(0, 5);
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  /** Check if an excerpt is malformed: truncated, contains markdown, or strange chars */
  private isBadExcerpt(excerpt: string): boolean {
    if (!excerpt || excerpt.length < 20) return true;
    const trimmed = excerpt.trimEnd();
    const endsWithSentenceEnd = /[.!?]$/.test(trimmed);
    const hasMarkdown = /[#*_\[\]]/.test(excerpt);
    const hasStrangeChars = /[^\w\s.,;:!?'"()\-/%&+rupiah\d]/i.test(excerpt);
    return !endsWithSentenceEnd || hasMarkdown || hasStrangeChars;
  }

  /** Check if tags array contains poorly formatted tags */
  private hasBadTags(tags: string[]): boolean {
    if (tags.length === 0) return true;
    return tags.some((tag) => {
      const t = tag.toLowerCase().trim();
      if (t.includes("-") && t.length > 6) return true;
      if (["berita", "news", "artikel"].includes(t)) return true;
      if (t.length === 0) return true;
      if (!/[a-z]/.test(t)) return true;
      return false;
    });
  }
}
