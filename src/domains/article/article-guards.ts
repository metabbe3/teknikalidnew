/**
 * article-guards.ts — SATU PINTU generation guard pipeline (fix-2026-10-26-11).
 *
 * Pipeline (urutan sama dengan generateNewsArticle, diekstrak verbatim):
 *   1. sanitizeGeneratedContent — buang prompt-leak & markup berbahaya
 *   2. validateArticle (QualityGate) — deterministik, 0 token, throw saat error
 *   3. dedup checkArticleSimilarity — 1 AI call vs judul terbaru
 *   4. factCheckArticle + factCheckVerdict — koreksi otomatis / hold-as-draft
 *
 * Jalur yang memakai modul ini: news (generateNewsArticle) + movement-analysis
 * (generateForStock). Sebelum modul ini, jalur movement publish TANPA guard.
 */
import { sanitizeGeneratedContent } from "./content-sanitizer";
import { validateArticle } from "./quality-validator";
import { createAIProvider } from "./ai-provider";
import {
  factCheckArticle,
  factCheckVerdict,
  gatherMarketContext,
  extractTickersFromText,
  type MarketContext,
  type FactCheckResult,
} from "./article-fact-check";
import { articleRepository } from "./article.repository";
import { resolveTitle } from "./title-guard";

export interface GenerationGuardsInput {
  /** Raw AI output — belum disanitasi. */
  content: string;
  /** Raw judul AI (atau topik) — akan ikut disanitasi. */
  title: string;
  /** Keyword utama untuk gate primary-keyword; [0] wajib muncul di judul/konten. */
  keywords: string[];
  /** Fallback judul saat AI tidak menghasilkan judul valid. */
  fallbackTitle: string;
  /** Gate 2 & 4 butuh market context; null → kumpulkan dari konten (fail-soft). */
  marketCtx?: MarketContext | null;
  /** Override gate 4 (selftest / jalur yang sudah punya hasil factCheck). */
  factCheckOverride?: FactCheckResult | null;
  /** Override gate 2 hasil similarity (selftest — hindari AI call / DB read). */
  dedupOverride?: { isDuplicate: boolean; similarityScore: number; similarTo: string | null };
  /** Minimum kata — default 1200 (artikel panjang); movement pakai 300. */
  opts?: { minWords?: number; structure?: { minH2?: number; requireCta?: boolean; requireDisclaimer?: boolean } };
  /** Log prefix per jalur (mis. path=news / path=movement). */
  logPath?: string;
}

export interface GenerationGuardsResult {
  /** Konten final (pasca koreksi factCheck bila ada). */
  content: string;
  /** Judul final (pasca koreksi factCheck bila ada). */
  title: string;
  /** publish = lolos semua gate; draft = factCheck hold tanpa koreksi. */
  status: "publish" | "draft";
  /** Metadata untuk Article.generationMeta (persist sebagai bukti gate jalan). */
  meta: Record<string, string>;
}

/**
 * Menjalankan SEMUA gate dan mengembalikan konten/judul final + status.
 * Throw ArticleGenerationError saat gate hard-fail (quality/dedup) — caller
 * TIDAK boleh menulis apa pun ke DB saat error terlempar.
 */
export async function runGenerationGuards(input: GenerationGuardsInput): Promise<GenerationGuardsResult> {
  const logPath = input.logPath ?? "guards";
  const cleanContent = sanitizeGeneratedContent(input.content);
  let finalTitle = resolveTitle(sanitizeGeneratedContent(input.title), cleanContent, input.fallbackTitle);

  // ── Gate 1: Quality validation (instant, deterministic, zero tokens) ──
  const quality = validateArticle(cleanContent, finalTitle, input.keywords, input.opts);
  console.info(`[QualityGate] path=${logPath} Score: ${quality.score}/100 | Passed: ${quality.passed} | Words: ${quality.meta.wordCount} | H2: ${quality.meta.h2Count} | Tickers: ${quality.meta.tickerCount}`);
  if (!quality.passed) {
    const errorIssues = quality.issues.filter((i) => i.severity === "error");
    console.warn(`[QualityGate] path=${logPath} REJECTED — Issues: ${errorIssues.map((i) => `${i.rule}(${i.severity})`).join(", ")}`);
    const { ArticleGenerationError } = await import("./article.errors");
    throw new ArticleGenerationError(
      `Article rejected by quality gate: ${errorIssues.map((i) => i.message).join("; ")}`,
    );
  }

  // ── Gate 2: Dedup check (1 AI call) ──
  const dedup =
    input.dedupOverride ??
    (await (async () => {
      const provider = createAIProvider();
      const recentTitles = await articleRepository.findRecentTitles(30);
      return provider.checkArticleSimilarity(finalTitle, recentTitles);
    })());
  console.info(`[DedupCheck] path=${logPath} Similarity: ${dedup.similarityScore}% | Duplicate: ${dedup.isDuplicate}${dedup.similarTo ? ` | Similar to: "${dedup.similarTo.slice(0, 60)}..."` : ""}`);
  if (dedup.isDuplicate) {
    const { ArticleGenerationError } = await import("./article.errors");
    throw new ArticleGenerationError(`Skipped: article too similar (score ${dedup.similarityScore}%) to existing article: "${dedup.similarTo}"`);
  }

  // ── Gate 4 (fact-check) — jalur sama dengan generateNewsArticle ──
  let finalContent = cleanContent;
  let factCheckMeta: Record<string, string> = {};
  let factCheckHeld = false;
  const gateCtx: MarketContext | null =
    input.factCheckOverride !== undefined
      ? input.marketCtx ?? null
      : input.marketCtx ??
        (await gatherMarketContext(extractTickersFromText(`${input.fallbackTitle} ${cleanContent}`)).catch((err) => {
          console.warn(`[FactCheckGate] path=${logPath} gatherMarketContext failed, gate skipped:`, err instanceof Error ? err.message : err);
          return null;
        }));
  if (gateCtx || input.factCheckOverride) {
    const factCheck = input.factCheckOverride ?? await factCheckArticle(cleanContent, gateCtx!, finalTitle);
    const verdict = factCheckVerdict(factCheck);
    if (verdict.applyCorrection && factCheck.correctedContent) {
      finalContent = sanitizeGeneratedContent(factCheck.correctedContent);
      if (factCheck.correctedTitle) {
        finalTitle = sanitizeGeneratedContent(factCheck.correctedTitle);
      }
    }
    if (verdict.holdAsDraft) {
      factCheckHeld = true;
      console.warn(`[FactCheckGate] path=${logPath} HELD AS DRAFT — fact-check failed with no correction.`);
    }
    console.info(`[FactCheckGate] path=${logPath} claims=${factCheck.meta.claimsChecked} mismatch=${factCheck.mismatches.length} hold=${verdict.holdAsDraft}`);
    factCheckMeta = {
      factCheckPassed: String(factCheck.passed),
      factCheckClaimsChecked: String(factCheck.meta.claimsChecked),
      factCheckErrors: String(factCheck.mismatches.length),
      factCheckCorrected: String(verdict.applyCorrection),
      ...(verdict.holdAsDraft ? { factCheckHeld: "true" } : {}),
    };
  } else {
    factCheckMeta = { factCheckPassed: "skipped_no_ctx" };
  }

  const status: "publish" | "draft" = factCheckHeld ? "draft" : "publish";
  const meta: Record<string, string> = {
    ...factCheckMeta,
    qualityScore: String(quality.score),
    qualityPassed: String(quality.passed),
    qualityWordCount: String(quality.meta.wordCount),
    dedupScore: String(dedup.similarityScore),
    dedupDuplicate: String(dedup.isDuplicate),
  };
  return { content: finalContent, title: finalTitle, status, meta };
}
