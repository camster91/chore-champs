import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        // Prevent stale HTML caching across deploys (affects non-immutable routes only)
        source: '/((?!_next/static|_next/image|favicon|manifest|robots|sitemap).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate, no-cache, no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
