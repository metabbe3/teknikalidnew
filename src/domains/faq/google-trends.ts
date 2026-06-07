const STOCK_RELATED_REGEX = /saham|stock|trading|investasi|ihsg|bursa/i;

export async function fetchIndonesianStockTrends(): Promise<string[]> {
  try {
    // Dynamic import so the module is optional — if not installed, we catch and return []
    const googleTrends = await import("google-trends-api");
    const api = googleTrends.default ?? googleTrends;

    const result = await api.relatedQueries({
      keyword: "saham",
      geo: "ID",
      time: "today 3-m",
    });

    // google-trends-api returns a JSON string
    const parsed = typeof result === "string" ? JSON.parse(result) : result;

    // Extract rising queries from the response
    const defaultRankData = parsed?.default?.rankedList?.[0]?.rankedItem;
    const risingData = parsed?.default?.rankedList?.[1]?.rankedItem;

    // Prefer rising queries; fall back to top queries
    const queries: string[] = [];

    if (Array.isArray(risingData)) {
      for (const item of risingData) {
        if (item?.title && typeof item.title === "string") {
          queries.push(item.title);
        }
      }
    }

    // Supplement with top queries if rising is sparse
    if (queries.length < 10 && Array.isArray(defaultRankData)) {
      for (const item of defaultRankData) {
        if (item?.title && typeof item.title === "string" && !queries.includes(item.title)) {
          queries.push(item.title);
        }
      }
    }

    // Filter for stock-related queries only
    const filtered = queries.filter((q) => STOCK_RELATED_REGEX.test(q));

    // Return max 20
    return filtered.slice(0, 20);
  } catch {
    // google-trends-api is flaky — return empty array on any failure
    return [];
  }
}
