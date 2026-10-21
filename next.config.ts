import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["next-auth"],
  serverExternalPackages: ["yahoo-finance2", "@deno/shim-deno"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "date-fns",
      "technicalindicators",
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        dns: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      // Screener merged into Saham (/stocks?view=screener). 308 permanent — SEO equity passes.
      // Source query params (tab, preset) are forwarded to the destination.
      {
        source: "/screener",
        destination: "/stocks?view=screener",
        permanent: true,
      },
      // Community post shares used to build /community/<id> (404). Real route is /community/post/[id].
      // 308 for links already circulating in chats before the share-modal fix.
      {
        source: "/community/:id",
        destination: "/community/post/:id",
        permanent: true,
      },
      // Dated indicator archive collapsed into the per-ticker history TABLE page
      // (anti-spam: ~47k dated URLs → ~190 table pages). 308 passes link equity +
      // consolidates the dated URL into the canonical table page. See SEO plan.
      {
        source: "/stocks/:ticker/indikator/:date",
        destination: "/stocks/:ticker/indikator",
        permanent: true,
      },
      // Crypto deprioritized (83 views all-time, junk listing data): listing goes to
      // Saham. /crypto/[ticker] detail pages stay orphaned + noindex — avoids a loop
      // with the stocks→crypto ticker redirect.
      {
        source: "/crypto",
        destination: "/stocks",
        permanent: true,
      },
      // "idx radar" brand query (GSC: pos ~12, CTR 100% — 7 klik/7d) lands on /idx-radar
      // which has never existed (404). The ranked intent = our radar surface: /stocks
      // (H1 "Radar Saham IDX"). DEVIATION from house permanent:true (308) pattern:
      // spec done-when requires a literal 301 (curl -I check) — statusCode explicit.
      // SEO-equivalent to 308 for Google equity; seo-2026-10-20-01, decision logged
      // in docs/agent-org/decisions.md.
      {
        source: "/idx-radar",
        destination: "/stocks",
        statusCode: 301,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          // X-Content-Type-Options dipindah ke proxy.ts (conditional — RSC payload tanpa nosniff,
          // Safari iOS men-download text/x-component+nosniff; bug dialog download iPhone 12 Okt)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/(_next/static/:path*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path((?!api|_next|admin|dashboard|auth).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
