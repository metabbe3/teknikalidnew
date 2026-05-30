import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["next-auth"],
  serverExternalPackages: ["yahoo-finance2", "@deno/shim-deno"],
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
};

export default nextConfig;
