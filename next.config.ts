import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  cacheMaxMemorySize: 0,
};

export default nextConfig;
