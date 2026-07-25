/**
 * Shared Zod validation helpers for API routes.
 *
 * Usage:
 *   import { parseBody, schemas } from "@/lib/validation";
 *
 *   const [data, error] = await parseBody(req, schemas.createPost);
 *   if (error) return error;
 */

import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Parse and validate request body against a Zod schema.
 * Returns [data, null] on success, [null, errorResponse] on failure.
 *
 * @example
 * const [data, error] = await parseBody(req, createPostSchema);
 * if (error) return error;
 * // data is now typed as T
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<[T, null] | [null, NextResponse]> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return [
        null,
        NextResponse.json(
          {
            error: "Validation failed",
            details: result.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        ),
      ];
    }
    return [result.data, null];
  } catch {
    return [null, NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })];
  }
}

/**
 * Parse and validate URL search params against a Zod schema.
 * Returns [data, null] on success, [null, errorResponse] on failure.
 *
 * @example
 * const [data, error] = parseQuery(request.nextUrl.searchParams, paginationSchema);
 * if (error) return error;
 * // data is now typed as T
 */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
): [T, null] | [null, NextResponse] {
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  const result = schema.safeParse(params);
  if (!result.success) {
    return [
      null,
      NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
    ];
  }
  return [result.data, null];
}

// Type for the result of parseQuery
export type ParseQueryResult<T> = [T, null] | [null, NextResponse];

/**
 * Common reusable validation schemas for TeknikalID API routes.
 */
export const schemas = {
  // Stock
  ticker: z.string().min(1).max(10).toUpperCase(),

  // Community — Create Post
  createPost: z.object({
    content: z.string().min(1).max(5000),
    tickerTag: z.string().min(1).max(10).optional(),
    predictionDirection: z.enum(["bullish", "bearish"]).optional(),
    predictionTarget: z.number().positive().optional(),
    imageUrl: z.string().url().optional(),
    pollOptions: z.array(z.string().min(1).max(100)).min(2).max(5).optional(),
  }),

  // Community — Create Comment (postId OR stockTicker required)
  createComment: z.object({
    content: z.string().min(1).max(2000),
    postId: z.string().min(1).optional(),
    stockTicker: z.string().min(1).max(10).optional(),
    parentId: z.string().min(1).optional(),
  }).refine(
    (d) => d.postId || d.stockTicker,
    { message: "Either postId or stockTicker must be provided" },
  ),

  // Social — Follow
  follow: z.object({
    userId: z.string().min(1),
  }),

  // Pagination
  pagination: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),

  // Auth
  updateUser: z.object({
    name: z.string().min(1).max(100).optional(),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric with underscores")
      .optional(),
    bio: z.string().max(500).optional(),
  }),

  // Watchlist
  watchlistBatch: z.object({
    tickers: z.array(z.string().min(1).max(10)).min(1).max(50),
  }),

  // Route-specific schemas

  // watchlist - POST body
  addToWatchlist: z.object({
    ticker: z.string().min(1).max(10).toUpperCase(),
  }),

  // stocks/compare - GET query
  stockCompare: z.object({
    s: z.array(z.string().min(1).max(10).toUpperCase()).min(2).max(4),
    range: z.enum(["1d", "5d", "1m", "3m", "6m", "1y", "5y"]).default("6m"),
  }),

  // stocks - GET query
  stockList: z.object({
    sector: z.string().optional(),
  }),

  // screener - GET query
  screener: z.object({
    preset: z.string().optional(),
    rsi_min: z.coerce.number().int().min(0).max(100).optional(),
    rsi_max: z.coerce.number().int().min(0).max(100).optional(),
    stoch_k_min: z.coerce.number().int().min(0).max(100).optional(),
    stoch_k_max: z.coerce.number().int().min(0).max(100).optional(),
    adx_min: z.coerce.number().int().min(0).max(100).optional(),
    vol_multiplier: z.coerce.number().positive().optional(),
    signal_score_min: z.coerce.number().int().min(0).max(100).optional(),
    signal_score_max: z.coerce.number().int().min(0).max(100).optional(),
    sector: z.string().optional(),
    price_min: z.coerce.number().positive().optional(),
    price_max: z.coerce.number().positive().optional(),
    exclude_gorengan: z.enum(["true", "false"]).optional(),
    above_sma200: z.enum(["true", "false"]).optional(),
    below_sma200: z.enum(["true", "false"]).optional(),
    macd_bullish: z.enum(["true", "false"]).optional(),
    bb_squeeze: z.enum(["true", "false"]).optional(),
    sort_by: z.enum(["signalScore", "rsi14", "volume", "changePercent", "close"]).optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
  }),

  // faq/submit - POST body
  submitFaq: z.object({
    question: z.string().min(10).max(500),
    category: z.string().optional(),
  }),

  // users/search - GET query
  userSearch: z.object({
    q: z.string().min(1).max(100),
  }),

  // track/pageview - POST body
  pageview: z.object({
    path: z.string().min(1),
    // Tolerate an empty referrer (document.referrer === "" on direct traffic);
    // the beacon is fire-and-forget and must never 400 on a blank referrer.
    referrer: z.union([z.string().url(), z.literal("")]).optional(),
  }),

  // admin/eod-logs - GET query
  eodLogs: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),

  // posts - GET query
  postsFeed: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    sort: z.enum(["trending"]).optional(),
    filter: z.enum(["following"]).optional(),
    q: z.string().optional(),
    ticker: z.string().min(1).max(10).optional(),
    tag: z.string().optional(),
  }),

  // stocks/[ticker]/comments - GET query
  stockComments: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),

  // stocks/[ticker]/comments - POST body
  createStockComment: z.object({
    content: z.string().min(1).max(2000),
    parentId: z.string().min(1).optional(),
  }),

  // admin/users - GET query
  adminUsersList: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().max(100).optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    banned: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["createdAt", "username", "reputation"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),

  // admin/users - PATCH body
  adminUserAction: z.object({
    userId: z.string().min(1),
    action: z.enum(["ban", "unban", "promote", "demote"]),
  }),

  // articles - GET query
  articlesList: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    tag: z.string().optional(),
    type: z.string().optional(),
  }),

  // faq - GET query
  faqList: z.object({
    category: z.string().optional(),
    tag: z.string().optional(),
    ticker: z.string().min(1).max(10).optional(),
    cursor: z.string().optional(),
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),

  // faq/trending - GET query
  faqTrending: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(10),
  }),

  // reputation - GET query
  reputationQuery: z.object({
    userId: z.string().min(1).optional(),
  }),
};
