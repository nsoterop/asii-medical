import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    turbo: {
      // logLevel: 'info', // 'error', 'warn', 'info', 'debug'
    },
  },
};

export default nextConfig;
