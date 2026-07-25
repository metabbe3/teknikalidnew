import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * Robots configuration for search engine crawlers.
 *
 * NOTE: Cloudflare's "AI Audit" managed content injects an additional
 * `User-agent: *` block above this file's output at the CDN edge.
 * To avoid ambiguity, we explicitly allow Googlebot here so that
 * the merged robots.txt always permits Google's indexing crawler.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Explicitly allow Googlebot (defense against CF merge ambiguity)
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/auth/", "/admin/", "/paper-trading/", "/portfolio/", "/profile", "/watchlist", "/billing", "/settings", "/payment"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/admin/", "/paper-trading/", "/portfolio/", "/profile", "/watchlist", "/billing", "/settings", "/payment"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
