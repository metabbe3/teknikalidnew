export interface CursorPageResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Paginate results fetched with `take: limit + 1`.
 * Returns trimmed items and the next cursor (last item's id) or null.
 */
export function paginateResults<T extends { id: string }>(
  items: T[],
  limit: number,
): CursorPageResult<T> {
  const hasMore = items.length > limit;
  const trimmed = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore
    ? (trimmed[trimmed.length - 1]?.id ?? null)
    : null;
  return { items: trimmed, nextCursor };
}

/**
 * Returns a Prisma `where` clause fragment for cursor-based pagination.
 */
export function cursorWhere(cursor?: string): Record<string, unknown> {
  return cursor ? { id: { lt: cursor } } : {};
}
