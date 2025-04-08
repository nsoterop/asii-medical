import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const rewrites = [
      {
        source: '/api/:path*',
        destination: `http://ec2-3-95-177-173.compute-1.amazonaws.com:3001/api/:path*`,
      },
    ]
    console.log('Configured rewrites:', rewrites); // Visible during build
    return rewrites;
  },
};

export default nextConfig;
