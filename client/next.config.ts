import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://ec2-3-95-177-173.compute-1.amazonaws.com:3001/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
