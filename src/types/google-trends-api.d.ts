declare module "google-trends-api" {
  interface RelatedQueriesResult {
    default?: {
      rankedList?: Array<{
        rankedKeywords?: Array<{
          query: string;
        }>;
      }>;
    };
  }

  interface GoogleTrendsApi {
    relatedQueries(options: {
      keyword: string;
      geo?: string;
      time?: string;
    }): Promise<string>;
  }

  const api: GoogleTrendsApi;
  export default api;
}
