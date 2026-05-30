import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["next-auth"],
};

export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
    })
  : nextConfig;
