import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  transpilePackages: ['@veritrust/db', '@veritrust/shared-types', '@veritrust/canonical-schemas'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // viem + @react-pdf use Node-only modules; mark them external for server.
  serverExternalPackages: ['@react-pdf/renderer'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
