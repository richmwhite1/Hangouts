/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone output for now - using custom server
  reactStrictMode: true,
  
  // Production optimizations
  swcMinify: true,
  
  // Disable problematic features
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Server external packages for Railway
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('ws')
    }
    return config
  },
  
  // Images configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/image/resize**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/placeholder-*',
      },
    ],
    domains: ['localhost'],
  },
  
  // Environment variables
  env: {
    PORT: process.env.PORT || '8080',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
};

module.exports = nextConfig;
