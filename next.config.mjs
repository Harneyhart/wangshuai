/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.BUILD_DIR,
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/demo',
        destination: '/demo/a1',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/welcome',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
