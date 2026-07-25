/**
 * Comprehensive Analytics Service
 *
 * Extracts deep insights from existing PageView data:
 * - Hourly traffic patterns (peak hours)
 * - Traffic source categorization (organic search, social, direct, referral)
 * - Search keyword extraction (from Google, Bing, Yahoo referrers)
 * - Page attraction ranking (views + unique visitors + retention proxy)
 * - Device + browser breakdown
 * - Geographic distribution
 * - Content-section breakdown (news vs stocks vs home — answers "what drives traffic")
 * - Custom date range + path filtering
 *
 * Numbers reflect REAL visitors: owner/internal IPs and bots are excluded
 * (see buildExclusions / detectSuspectedBotIps). No schema migration needed —
 * all data extracted from existing referrer + userAgent fields.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getApiTrafficSummary, type ApiTrafficSummary } from "@/lib/api-traffic-log";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsFilter {
  startDate: Date;
  endDate: Date;
  pathPattern?: string;
  source?: TrafficSource;
}

export type TrafficSource =
  | "organic-search"
  | "social"
  | "direct"
  | "referral"
  | "email";

export interface HourlyBucket {
  hour: number; // 0-23
  label: string; // "00:00", "01:00", etc.
  views: number;
  uniqueVisitors: number;
}

export interface SourceBreakdown {
  source: TrafficSource;
  label: string;
  views: number;
  percentage: number;
}

export interface KeywordEntry {
  keyword: string;
  views: number;
  source: string; // google, bing, etc.
}

export interface OrganicPageEntry {
  path: string;
  views: number;
  uniqueVisitors: number;
  inferredKeywords: string[];
}

export interface PageAttraction {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgViewsPerVisitor: number;
  authedViews: number;
  changePct: number | null;
}

export interface DeviceBreakdown {
  category: string;
  count: number;
  percentage: number;
}

export interface GeoEntry {
  label: string;
  count: number;
  percentage: number;
}

export interface SectionEntry {
  section: string;
  label: string;
  views: number;
  uniqueVisitors: number;
}

export interface ComprehensiveAnalytics {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    authedViews: number;
    anonViews: number;
    avgViewsPerVisitor: number;
    bounceRate: number; // % of visitors with only 1 page view
    realtimeVisitors: number;
    peakHour: { hour: number; label: string; views: number } | null;
    botViews: number; // total bot page views (isBot flag)
    botVisitors: number; // unique bot IPs
    excludedViews: number; // owner/internal/suspected-bot views removed from metrics
    excludedIps: number; // distinct owner/internal IPs excluded
    suspectedBotIps: number; // distinct IPs flagged by the behavioral heuristic
  };
  hourly: HourlyBucket[];
  daily: { date: string; views: number; uniqueVisitors: number }[];
  sections: SectionEntry[];
  trafficSources: SourceBreakdown[];
  topKeywords: KeywordEntry[];
  topOrganicPages: OrganicPageEntry[];
  topPages: PageAttraction[];
  devices: DeviceBreakdown[];
  browsers: DeviceBreakdown[];
  topReferrers: { referrer: string; source: TrafficSource; count: number }[];
  geo: GeoEntry[];
  apiTraffic: ApiTrafficSummary;
  realtime: {
    ip: string | null;
    path: string;
    source: TrafficSource;
    keyword: string | null;
    time: Date;
    isBot: boolean;
  }[];
  comparison: {
    currentViews: number;
    previousViews: number;
    viewsChangePct: number | null;
    currentUnique: number;
    previousUnique: number;
    uniqueChangePct: number | null;
  };
}

// ─── Traffic Source Detection ────────────────────────────────────────────────

const SEARCH_ENGINES: Record<string, string> = {
  "google.": "Google",
  "bing.": "Bing",
  "yahoo.": "Yahoo",
  "duckduckgo.": "DuckDuckGo",
  "baidu.": "Baidu",
  "yandex.": "Yandex",
  "search.brave.": "Brave",
};

const SOCIAL_PLATFORMS: Record<string, string> = {
  "facebook.": "Facebook",
  "t.co": "Twitter/X",
  "twitter.": "Twitter/X",
  "x.com": "Twitter/X",
  "instagram.": "Instagram",
  "linkedin.": "LinkedIn",
  "tiktok.": "TikTok",
  "reddit.": "Reddit",
  "pinterest.": "Pinterest",
  "youtube.": "YouTube",
  "wa.me": "WhatsApp",
  "web.whatsapp.": "WhatsApp",
  "t.me": "Telegram",
};

const EMAIL_PROVIDERS: Record<string, string> = {
  "mail.google.": "Gmail",
  "outlook.": "Outlook",
  "mail.yahoo.": "Yahoo Mail",
};

/**
 * Categorize a referrer URL into a traffic source.
 * Returns the source category and the platform name if identifiable.
 */
export function categorizeReferrer(
  referrer: string | null | undefined,
): { source: TrafficSource; platform: string | null } {
  if (!referrer || referrer.trim() === "") {
    return { source: "direct", platform: null };
  }

  let hostname: string;
  try {
    hostname = new URL(referrer).hostname.toLowerCase();
  } catch {
    // Not a valid URL — treat as direct
    return { source: "direct", platform: null };
  }

  // Check if it's our own domain
  if (
    hostname.includes("teknikal.id") ||
    hostname.includes("localhost") ||
    hostname.includes("stockwise.id")
  ) {
    return { source: "direct", platform: null };
  }

  // Check search engines
  for (const [domain, name] of Object.entries(SEARCH_ENGINES)) {
    if (hostname.includes(domain)) {
      return { source: "organic-search", platform: name };
    }
  }

  // Check social media
  for (const [domain, name] of Object.entries(SOCIAL_PLATFORMS)) {
    if (hostname.includes(domain)) {
      return { source: "social", platform: name };
    }
  }

  // Check email
  for (const [domain, name] of Object.entries(EMAIL_PROVIDERS)) {
    if (hostname.includes(domain)) {
      return { source: "email", platform: name };
    }
  }

  // Everything else is a referral
  return { source: "referral", platform: hostname };
}

// ─── Keyword Inference from Path ─────────────────────────────────────────────

/**
 * Infer likely search keywords from a page path.
 * Google doesn't pass keywords, but we know the intent from the landing page.
 * e.g., /stocks/BBCA → ["saham bbca", "harga saham bbca", "analisa saham bbca"]
 */
function inferKeywordsFromPath(path: string): string[] {
  // Stock pages: /stocks/BBCA or /stocks/BBCA.JK
  const stockMatch = path.match(/^\/stocks\/([A-Za-z0-9]+)/i);
  if (stockMatch) {
    const ticker = stockMatch[1].replace(/\.jk$/i, "").toUpperCase();
    return [`saham ${ticker}`, `harga saham ${ticker}`, `analisa saham ${ticker}`];
  }

  // Berita/articles: /berita/some-article-slug
  const beritaMatch = path.match(/^\/berita\/(.+)$/i);
  if (beritaMatch) {
    const slug = beritaMatch[1].replace(/-/g, " ");
    return [slug.substring(0, 60)];
  }

  // Akademi: /akademi/some-topic
  const akademiMatch = path.match(/^\/akademi\/(.+)$/i);
  if (akademiMatch) {
    const slug = akademiMatch[1].replace(/-/g, " ");
    return [`belajar ${slug.substring(0, 50)}`, `cara ${slug.substring(0, 50)}`];
  }

  // Screener
  if (path.includes("screener")) return ["screener saham", "filter saham"];
  // Community
  if (path.includes("community")) return ["diskusi saham", "forum saham"];
  // Paper trading
  if (path.includes("paper-trading")) return ["paper trading", "simulasi trading saham"];

  return [];
}

// ─── Keyword Extraction ───────────────────────────────────────────────────────

/**
 * Extract search keywords from a referrer URL.
 * Google/Bing/Yahoo use `q` parameter, Yandex uses `text`, Baidu uses `wd`.
 */
export function extractKeyword(referrer: string | null | undefined): string | null {
  if (!referrer) return null;

  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const isSearchEngine = Object.keys(SEARCH_ENGINES).some((d) =>
    hostname.includes(d),
  );

  if (!isSearchEngine) return null;

  // Common search query parameters
  const q =
    url.searchParams.get("q") ??
    url.searchParams.get("text") ??
    url.searchParams.get("wd") ??
    url.searchParams.get("query") ??
    url.searchParams.get("p");

  if (!q || q.trim().length < 2) return null;

  // Decode and clean
  const decoded = decodeURIComponent(q).trim().toLowerCase();

  // Filter out junk
  if (decoded.length > 200) return null;

  return decoded;
}

// ─── User Agent Parsing (lightweight, no external dep) ───────────────────────

interface ParsedUA {
  browser: string;
  os: string;
  device: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Desktop" };

  const lower = ua.toLowerCase();

  // Device type
  const device =
    lower.includes("mobile") ||
    lower.includes("android") ||
    lower.includes("iphone")
      ? "Mobile"
      : lower.includes("ipad") || lower.includes("tablet")
        ? "Tablet"
        : "Desktop";

  // Browser
  let browser = "Unknown";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) browser = "Safari";

  // OS
  let os = "Unknown";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("mac os") || lower.includes("macos")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  return { browser, os, device };
}

// ─── Exclusion & Bot Heuristics ───────────────────────────────────────────────

// ponytail: env var for owner/internal/monitor IPs. Admin traffic is auto-excluded
// below too, so this is mainly for non-admin monitors. No DB table — IPs are semi-static.
const EXCLUDED_IPS = new Set(
  (process.env.ANALYTICS_EXCLUDE_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const SECTION_LABELS: Record<string, string> = {
  home: "Home",
  news: "News (/berita)",
  stocks: "Stocks (/stocks)",
  screener: "Screener",
  community: "Community",
  other: "Other",
};

/** Map a request path to a coarse content section. */
function classifySection(path: string): string {
  if (path === "/") return "home";
  if (path.startsWith("/berita")) return "news";
  if (path.startsWith("/stocks")) return "stocks";
  if (path.startsWith("/screener")) return "screener";
  if (path.startsWith("/community")) return "community";
  return "other";
}

interface AnalyticsRow {
  ip: string | null;
  path: string;
  isBot: boolean;
  createdAt: Date;
}

/**
 * Detect IPs whose behavior is bot-like via signatures the write-time UA
 * detector cannot see (these bots spoof real Chrome UAs):
 *   (a) the same path fired twice within 2s across MANY pages — a rank-tracker
 *       double-fires its beacon per tracked page; or
 *   (b) a single path fired ≥6 times within 2s windows — a refresh-spam monitor.
 * Real visitors occasionally double-load one or two pages (slow link, double
 * click), so we require breadth (≥3 pages) or heavy repeat (≥6) — never a
 * single accident.
 *
 * ponytail: behavioral heuristic, not a per-request rate limiter. Ceiling: a
 * human double-loading 3+ distinct pages in <2s each is implausible. Upgrade
 * path: keep a short per-IP request log + rate limit at write time.
 */
function detectSuspectedBotIps(rows: AnalyticsRow[]): Set<string> {
  const byIp = new Map<string, Map<string, Date[]>>();
  for (const r of rows) {
    if (!r.ip || r.isBot) continue;
    let paths = byIp.get(r.ip);
    if (!paths) {
      paths = new Map();
      byIp.set(r.ip, paths);
    }
    const arr = paths.get(r.path);
    if (arr) arr.push(r.createdAt);
    else paths.set(r.path, [r.createdAt]);
  }

  const suspected = new Set<string>();
  for (const [ip, paths] of byIp) {
    let dupePaths = 0;
    let maxFastHits = 0;
    for (const times of paths.values()) {
      if (times.length < 2) continue;
      times.sort((a, b) => a.getTime() - b.getTime());
      let fast = 0;
      for (let i = 1; i < times.length; i++) {
        if (times[i].getTime() - times[i - 1].getTime() < 2000) fast++;
      }
      if (fast > 0) dupePaths++;
      if (fast > maxFastHits) maxFastHits = fast;
    }
    if (dupePaths >= 3 || maxFastHits >= 6) suspected.add(ip);
  }
  return suspected;
}

// ─── Main Analytics Query ─────────────────────────────────────────────────────

const SOURCE_LABELS: Record<TrafficSource, string> = {
  "organic-search": "Organic Search",
  social: "Social Media",
  direct: "Direct",
  referral: "Referral",
  email: "Email",
};

export const analyticsService = {
  /**
   * Get comprehensive analytics with flexible filtering.
   * All metrics are computed on REAL visitors (owner/internal IPs + bots excluded).
   * Single query pass, then in-memory aggregation for derived metrics.
   */
  async getComprehensiveAnalytics(
    filter: AnalyticsFilter,
  ): Promise<ComprehensiveAnalytics> {
    const { startDate, endDate, pathPattern, source } = filter;

    // Build where clause
    const where: Record<string, unknown> = {
      createdAt: { gte: startDate, lt: endDate },
    };
    if (pathPattern) {
      where.path = { contains: pathPattern };
    }

    // Fetch all matching page views in one query
    const pageViews = await prisma.pageView.findMany({
      where,
      select: {
        path: true,
        referrer: true,
        userId: true,
        ip: true,
        userAgent: true,
        isBot: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // ─── Build exclusion set (owner/internal IPs + suspected bots) ─────────────
    // Auto-exclude admin traffic: any IP that appears on an admin user's pageview.
    // This catches the owner across any device/network without manual IP config.
    const adminIds = new Set(
      (
        await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        })
      ).map((u) => u.id),
    );
    const adminIps = new Set<string>();
    for (const v of pageViews) {
      if (v.userId && adminIds.has(v.userId) && v.ip) adminIps.add(v.ip);
    }

    const suspectedBotIps = detectSuspectedBotIps(pageViews);
    const internalIps = new Set<string>([...EXCLUDED_IPS, ...adminIps]);
    const isExcluded = (ip: string | null): boolean =>
      !!ip && (internalIps.has(ip) || suspectedBotIps.has(ip));

    // Real humans = not flagged bot, not owner/internal, not suspected bot.
    const realViews = pageViews.filter((v) => !v.isBot && !isExcluded(v.ip));
    const botViewsArr = pageViews.filter((v) => v.isBot);
    const excludedRows = pageViews.filter((v) => !v.isBot && isExcluded(v.ip));

    // Previous period for comparison (apply same exclusions for apples-to-apples)
    const prevDuration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - prevDuration);
    const prevWhere: Record<string, unknown> = {
      createdAt: { gte: prevStart, lt: startDate },
    };
    if (pathPattern) {
      prevWhere.path = { contains: pathPattern };
    }
    const prevPageViews = (
      await prisma.pageView.findMany({
        where: prevWhere,
        select: { ip: true, path: true },
      })
    ).filter((v) => !isExcluded(v.ip));

    const prevViews = prevPageViews.length;
    const prevUnique = new Set(
      prevPageViews.filter((v) => v.ip).map((v) => v.ip),
    ).size;

    // ─── Overview ─────────────────────────────────────────────────────────────
    const totalViews = realViews.length;
    const uniqueIPs = new Set(
      realViews.filter((v) => v.ip).map((v) => v.ip),
    );
    const uniqueVisitors = uniqueIPs.size;
    const authedViews = realViews.filter((v) => v.userId).length;
    const anonViews = totalViews - authedViews;

    // Bot stats
    const botViews = botViewsArr.length;
    const botVisitors = new Set(
      botViewsArr.filter((v) => v.ip).map((v) => v.ip),
    ).size;
    const excludedViews = excludedRows.length;

    // Bounce rate: visitors who only viewed 1 page
    const viewsByIP: Record<string, number> = {};
    for (const pv of realViews) {
      if (pv.ip) {
        viewsByIP[pv.ip] = (viewsByIP[pv.ip] || 0) + 1;
      }
    }
    const singlePageVisitors = Object.values(viewsByIP).filter(
      (c) => c === 1,
    ).length;
    const bounceRate =
      uniqueVisitors > 0
        ? Math.round((singlePageVisitors / uniqueVisitors) * 100)
        : 0;

    const avgViewsPerVisitor =
      uniqueVisitors > 0
        ? Math.round((totalViews / uniqueVisitors) * 100) / 100
        : 0;

    // ─── Hourly Breakdown ─────────────────────────────────────────────────────
    const hourBuckets: Record<number, { views: number; ips: Set<string> }> = {};
    for (let h = 0; h < 24; h++) hourBuckets[h] = { views: 0, ips: new Set() };

    for (const pv of realViews) {
      const h = pv.createdAt.getHours();
      hourBuckets[h].views++;
      if (pv.ip) hourBuckets[h].ips.add(pv.ip);
    }

    const hourly: HourlyBucket[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      views: hourBuckets[h].views,
      uniqueVisitors: hourBuckets[h].ips.size,
    }));

    // Find peak hour
    const peakHourBucket = hourly.reduce((max, h) =>
      h.views > max.views ? h : max,
    );
    const peakHour =
      peakHourBucket.views > 0
        ? {
            hour: peakHourBucket.hour,
            label: peakHourBucket.label,
            views: peakHourBucket.views,
          }
        : null;

    // ─── Daily Breakdown ──────────────────────────────────────────────────────
    const dailyMap: Record<
      string,
      { views: number; ips: Set<string> }
    > = {};
    for (const pv of realViews) {
      const dateKey = pv.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { views: 0, ips: new Set() };
      dailyMap[dateKey].views++;
      if (pv.ip) dailyMap[dateKey].ips.add(pv.ip);
    }
    const daily = Object.entries(dailyMap)
      .map(([date, d]) => ({
        date,
        views: d.views,
        uniqueVisitors: d.ips.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Content Sections (news vs stocks vs home …) ──────────────────────────
    const sectionMap: Record<string, { views: number; ips: Set<string> }> = {};
    for (const pv of realViews) {
      const s = classifySection(pv.path);
      if (!sectionMap[s]) sectionMap[s] = { views: 0, ips: new Set() };
      sectionMap[s].views++;
      if (pv.ip) sectionMap[s].ips.add(pv.ip);
    }
    const sections: SectionEntry[] = Object.entries(sectionMap)
      .map(([section, d]) => ({
        section,
        label: SECTION_LABELS[section] ?? section,
        views: d.views,
        uniqueVisitors: d.ips.size,
      }))
      .sort((a, b) => b.views - a.views);

    // ─── Traffic Sources ──────────────────────────────────────────────────────
    const sourceCounts: Record<TrafficSource, number> = {
      "organic-search": 0,
      social: 0,
      direct: 0,
      referral: 0,
      email: 0,
    };

    for (const pv of realViews) {
      const { source: src } = categorizeReferrer(pv.referrer);
      // Apply source filter if specified
      if (!source || src === source) {
        sourceCounts[src]++;
      }
    }

    const trafficSources: SourceBreakdown[] = (
      Object.entries(sourceCounts) as [TrafficSource, number][]
    )
      .map(([src, count]) => ({
        source: src,
        label: SOURCE_LABELS[src],
        views: count,
        percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // ─── Keywords ─────────────────────────────────────────────────────────────
    // NOTE: Google stopped passing ?q= in referrer URLs since 2011 (HTTPS).
    // extractKeyword() will rarely find real keywords. Instead, we also build
    // a "top organic landing pages" list with inferred keywords from page paths.
    const keywordMap: Record<string, { views: number; source: string }> = {};
    for (const pv of realViews) {
      const kw = extractKeyword(pv.referrer);
      if (kw) {
        if (!keywordMap[kw]) {
          const { platform } = categorizeReferrer(pv.referrer);
          keywordMap[kw] = { views: 0, source: platform || "Search" };
        }
        keywordMap[kw].views++;
      }
    }
    const topKeywords: KeywordEntry[] = Object.entries(keywordMap)
      .map(([keyword, data]) => ({ keyword, views: data.views, source: data.source }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 50);

    // ─── Top Organic Landing Pages (with inferred keywords) ───────────────────
    // Since Google doesn't pass keywords, we infer intent from page paths.
    // e.g., /stocks/BBCA → ["saham bbca", "harga bbca", "analisa bbca"]
    const organicPageMap: Record<string, { views: number; ips: Set<string> }> = {};
    for (const pv of realViews) {
      const { source: src } = categorizeReferrer(pv.referrer);
      if (src === "organic-search") {
        if (!organicPageMap[pv.path]) {
          organicPageMap[pv.path] = { views: 0, ips: new Set() };
        }
        organicPageMap[pv.path].views++;
        if (pv.ip) organicPageMap[pv.path].ips.add(pv.ip);
      }
    }
    const topOrganicPages: OrganicPageEntry[] = Object.entries(organicPageMap)
      .map(([path, data]) => ({
        path,
        views: data.views,
        uniqueVisitors: data.ips.size,
        inferredKeywords: inferKeywordsFromPath(path),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 25);

    // ─── Top Pages (with attraction metrics) ──────────────────────────────────
    const pageMap: Record<
      string,
      { views: number; ips: Set<string>; authedViews: number }
    > = {};
    for (const pv of realViews) {
      if (!pageMap[pv.path]) {
        pageMap[pv.path] = { views: 0, ips: new Set(), authedViews: 0 };
      }
      pageMap[pv.path].views++;
      if (pv.ip) pageMap[pv.path].ips.add(pv.ip);
      if (pv.userId) pageMap[pv.path].authedViews++;
    }

    // Get previous period page counts for change calculation
    const prevPageCounts: Record<string, number> = {};
    for (const pv of prevPageViews) {
      prevPageCounts[pv.path] = (prevPageCounts[pv.path] || 0) + 1;
    }

    const topPages: PageAttraction[] = Object.entries(pageMap)
      .map(([path, data]) => {
        const prevCount = prevPageCounts[path] || 0;
        const changePct =
          prevCount > 0
            ? Math.round(((data.views - prevCount) / prevCount) * 100)
            : null;
        return {
          path,
          views: data.views,
          uniqueVisitors: data.ips.size,
          avgViewsPerVisitor:
            data.ips.size > 0
              ? Math.round((data.views / data.ips.size) * 100) / 100
              : 0,
          authedViews: data.authedViews,
          changePct,
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 50);

    // ─── Devices & Browsers ───────────────────────────────────────────────────
    const deviceCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};
    for (const pv of realViews) {
      const parsed = parseUserAgent(pv.userAgent);
      deviceCounts[parsed.device] = (deviceCounts[parsed.device] || 0) + 1;
      browserCounts[parsed.browser] = (browserCounts[parsed.browser] || 0) + 1;
    }

    const ua = realViews.length || 1;
    const devices: DeviceBreakdown[] = Object.entries(deviceCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / ua) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const browsers: DeviceBreakdown[] = Object.entries(browserCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / ua) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // ─── Top Referrers (categorized) ──────────────────────────────────────────
    const referrerMap: Record<string, { count: number; source: TrafficSource }> = {};
    for (const pv of realViews) {
      if (!pv.referrer) continue;
      const { source: src, platform } = categorizeReferrer(pv.referrer);
      if (src === "direct") continue;
      const label = platform || pv.referrer;
      if (!referrerMap[label]) {
        referrerMap[label] = { count: 0, source: src };
      }
      referrerMap[label].count++;
    }
    const topReferrers = Object.entries(referrerMap)
      .map(([referrer, data]) => ({
        referrer,
        source: data.source,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ─── Geographic (from IP via cached lookup) ───────────────────────────────
    // Exclude owner/internal + suspected-bot IPs so geo reflects real visitors.
    const geoExcludeList = [...new Set([...internalIps, ...suspectedBotIps])];
    const geoIPs = await prisma.$queryRaw<
      { ip: string; cnt: bigint }[]
    >`
      SELECT ip, COUNT(*) as cnt
      FROM "PageView"
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        AND ip IS NOT NULL
        ${pathPattern ? Prisma.sql`AND path ILIKE ${`%${pathPattern}%`}` : Prisma.empty}
        ${geoExcludeList.length ? Prisma.sql`AND ip NOT IN (${Prisma.join(geoExcludeList)})` : Prisma.empty}
      GROUP BY ip
      ORDER BY cnt DESC
      LIMIT 100
    `;

    // Batch geo lookup
    const topIPList = geoIPs.map((r) => r.ip);
    const locations: Record<string, { country: string; city: string; isp: string }> = {};
    if (topIPList.length > 0) {
      try {
        const geoRes = await fetch(
          "http://ip-api.com/batch?fields=query,country,city,isp",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(topIPList),
            signal: AbortSignal.timeout(5000),
          },
        );
        if (geoRes.ok) {
          const geoData = (await geoRes.json()) as Array<{
            query: string;
            country: string;
            city: string;
            isp: string;
          }>;
          for (const entry of geoData) {
            locations[entry.query] = {
              country: entry.country,
              city: entry.city,
              isp: entry.isp,
            };
          }
        }
      } catch {
        // Geolocation failed — geo data will be "Unknown"
      }
    }

    const geoCounts: Record<string, number> = {};
    for (const row of geoIPs) {
      const loc = locations[row.ip];
      const label = loc ? `${loc.city}, ${loc.country}` : "Unknown";
      geoCounts[label] = (geoCounts[label] || 0) + Number(row.cnt);
    }
    const totalGeo = Object.values(geoCounts).reduce((a, b) => a + b, 0) || 1;
    const geo: GeoEntry[] = Object.entries(geoCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / totalGeo) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // ─── Realtime (last 5 min) ────────────────────────────────────────────────
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const apiTraffic = await getApiTrafficSummary(60);
    const realtimeViews = await prisma.pageView.findMany({
      where: { createdAt: { gte: fiveMinAgo } },
      select: { ip: true, path: true, referrer: true, isBot: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const realtimeUniqueIPs = new Set(
      realtimeViews
        .filter((v) => v.ip && !isExcluded(v.ip) && !v.isBot)
        .map((v) => v.ip),
    ).size;

    // ─── Comparison ───────────────────────────────────────────────────────────
    const currentUnique = uniqueVisitors;
    const viewsChangePct =
      prevViews > 0
        ? Math.round(((totalViews - prevViews) / prevViews) * 100)
        : null;
    const uniqueChangePct =
      prevUnique > 0
        ? Math.round(((currentUnique - prevUnique) / prevUnique) * 100)
        : null;

    return {
      overview: {
        totalViews,
        uniqueVisitors,
        authedViews,
        anonViews,
        avgViewsPerVisitor,
        bounceRate,
        realtimeVisitors: realtimeUniqueIPs,
        peakHour,
        botViews,
        botVisitors,
        excludedViews,
        excludedIps: internalIps.size,
        suspectedBotIps: suspectedBotIps.size,
      },
      hourly,
      daily,
      sections,
      trafficSources,
      topKeywords,
      topOrganicPages,
      topPages,
      devices,
      browsers,
      topReferrers,
      geo,
      apiTraffic,
      realtime: realtimeViews
        .filter((v) => !isExcluded(v.ip))
        .map((v) => {
          const { source: src } = categorizeReferrer(v.referrer);
          return {
            ip: v.ip,
            path: v.path,
            source: src,
            keyword: extractKeyword(v.referrer),
            time: v.createdAt,
            isBot: v.isBot,
          };
        }),
      comparison: {
        currentViews: totalViews,
        previousViews: prevViews,
        viewsChangePct,
        currentUnique,
        previousUnique: prevUnique,
        uniqueChangePct,
      },
    };
  },
};
