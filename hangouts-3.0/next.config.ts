import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  
  // Disable problematic features
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Production optimizations
  poweredByHeader: false,
  generateEtags: true,
  
  // Images configuration
  images: {
    domains: ['images.unsplash.com', 'localhost', 'img.clerk.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['localhost:3000', 'hangouts-3-0-production.up.railway.app']
    }
  },
  
  // Security headers - only apply nosniff in production to avoid dev server MIME type issues
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production'
    
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      // Only apply nosniff in production to avoid dev server MIME type issues
      // In development, Next.js handles MIME types correctly, and nosniff can interfere
      ...(isProduction ? [{ key: 'X-Content-Type-Options', value: 'nosniff' }] : []),
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/icon-:size(\\d+)x:size(\\d+).png',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Note: Content-Type headers for static files are handled automatically by Next.js
      // Explicitly setting them can cause issues if files don't exist yet
      // {
      //   source: '/_next/static/css/(.*\\.css)',
      //   headers: [
      //     {
      //       key: 'Content-Type',
      //       value: 'text/css; charset=utf-8',
      //     },
      //   ],
      // },
      // {
      //   source: '/_next/static/chunks/(.*\\.js)',
      //   headers: [
      //     {
      //       key: 'Content-Type',
      //       value: 'application/javascript; charset=utf-8',
      //     },
      //   ],
      // },
    ]
  },
  
  // Server external packages for Railway
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('ws')
    }
    
    // Exclude server-only modules from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
        assert: false,
        http: false,
        https: false,
        url: false,
        querystring: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
      }
    }
    
    return config
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_CLERK_DISABLE_KEYLESS_DRIFT_DETECTION: '1',
  },
};

export default nextConfig;
