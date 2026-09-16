import { ArticleType } from "@/generated/prisma/client";

/**
 * E-E-A-T freshness model for AI-generated articles.
 *
 * Google's Helpful Content system penalises auto-generated pages that claim to be
 * fresh ("hari ini") while serving stale price data. We avoid that two ways:
 *   1. An honest "Data terakhir: [date], sumber: Yahoo Finance" disclosure on the page.
 *   2. Auto-noindex pages whose underlying data has gone stale, so they drop out of
 *      the index instead of ranking for time-sensitive queries with old figures.
 *
 * `updatedAt` is the freshness signal — Prisma's `@updatedAt` bumps on every save,
 * and every generation path (snapshot/evergreen/movement) saves, so it reflects when
 * the article last consumed fresh market data.
 *
 * Thresholds are deliberately conservative to avoid weekend/holiday false positives:
 *   - Daily types (DAILY_SNAPSHOT, MOVEMENT_ANALYSIS): 3 days. Covers a normal
 *     Fri→Mon weekend; a "hari ini" snapshot older than that is genuinely stale.
 *   - Evergreen types (STOCK_ANALYSIS, NEWS, EDUCATIONAL, GENERAL): 60 days. Only
 *     catches truly abandoned pages, not a paused-but-valuable evergreen.
 */
const DAILY_STALE_MS = 3 * 24 * 60 * 60 * 1000;
const EVERGREEN_STALE_MS = 60 * 24 * 60 * 60 * 1000;

const DAILY_TYPES: ReadonlySet<ArticleType> = new Set([
  ArticleType.DAILY_SNAPSHOT,
  ArticleType.MOVEMENT_ANALYSIS,
]);

export function isStaleArticle(
  article: { articleType: ArticleType; updatedAt: Date },
  now: Date = new Date(),
): boolean {
  const maxAge = DAILY_TYPES.has(article.articleType) ? DAILY_STALE_MS : EVERGREEN_STALE_MS;
  return now.getTime() - article.updatedAt.getTime() > maxAge;
}

/** Source attribution shown next to the freshness stamp. */
export const DATA_SOURCE_LABEL = "Yahoo Finance";
