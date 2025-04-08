import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:3001/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
