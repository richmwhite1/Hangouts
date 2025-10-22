// Production Configuration for Railway Deployment
module.exports = {
  // Environment
  NODE_ENV: 'production',
  PORT: process.env.PORT || 8080,

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,

  // App URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://hangouts-production-adc4.up.railway.app',

  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  UPLOAD_DIR: 'public/uploads',

  // Rate Limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Security Headers
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },

  // CORS Configuration
  CORS_ORIGINS: [
    'https://hangouts-production-adc4.up.railway.app',
    'https://hangouts-3-0.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ],

  // Cache Configuration
  CACHE_TTL: {
    STATIC: 31536000, // 1 year
    DYNAMIC: 3600,    // 1 hour
    API: 300,         // 5 minutes
  },

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: 'logs/app.log',

  // Performance
  COMPRESSION: true,
  MINIFY: true,
  BUNDLE_ANALYZER: false,
}





