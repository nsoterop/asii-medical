import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: `http://localhost:3000/:path*`,
			},
		]
	},
};

export default nextConfig;
