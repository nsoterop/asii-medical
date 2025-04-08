import type { NextConfig } from "next";

const PUBLIC_URL = "http://localhost:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_BASE_URL || PUBLIC_URL}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
