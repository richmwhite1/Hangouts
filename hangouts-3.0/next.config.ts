import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['images.unsplash.com', 'localhost', 'img.clerk.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['localhost:3000', 'hangouts-3-0-production.up.railway.app']
    }
  },
  // Disable Clerk's keyless env drift detection to avoid server action errors
  webpack: (config: any) => {
    return config;
  },
  env: {
    CLERK_DISABLE_KEYLESS_DRIFT_DETECTION: 'true'
  }
};

export default nextConfig;



