declare module 'next-pwa' {
  import type { NextConfig } from 'next';
  function withPWA(config: {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp;
      handler: string;
      options?: Record<string, unknown>;
    }>;
  }): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}
