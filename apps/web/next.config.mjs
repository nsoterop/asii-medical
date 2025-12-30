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
      },
      {
        source: '/api/checkout/:path*',
        destination: `${process.env.API_PROXY_TARGET}/checkout/:path*`
      },
      {
        source: '/api/orders/:path*',
        destination: `${process.env.API_PROXY_TARGET}/orders/:path*`
      }
    ];
  }
};

export default nextConfig;
