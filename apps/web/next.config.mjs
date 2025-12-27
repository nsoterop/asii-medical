/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@asii/shared'],
  async rewrites() {
    return [
      {
        source: '/api/catalog/:path*',
        destination: `${process.env.API_PROXY_TARGET}/catalog/:path*`
      },
      {
        source: '/api/admin/:path*',
        destination: `${process.env.API_PROXY_TARGET}/admin/:path*`
      }
    ];
  }
};

export default nextConfig;
