// Production configuration and environment management

export const config = {
  // App Configuration
  app: {
    name: 'Hangouts 3.0',
    version: '1.0.0',
    description: 'Plan amazing hangouts with friends',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    supportEmail: 'support@hangouts.app'
  },

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}` : ''),
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/hangouts_3_0",
    maxConnections: 10,
    connectionTimeout: 30000
  },

  // Authentication Configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || "your-super-secret-jwt-key-here-make-it-long-and-random",
    jwtExpiresIn: '7d',
    refreshTokenExpiresIn: '30d',
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    imageQuality: 0.8,
    imageMaxWidth: 1920,
    imageMaxHeight: 1080
  },

  // Real-time Configuration
  realtime: {
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3000',
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  },

  // Cache Configuration
  cache: {
    ttl: {
      hangouts: 5 * 60 * 1000, // 5 minutes
      users: 10 * 60 * 1000, // 10 minutes
      friends: 15 * 60 * 1000, // 15 minutes
      notifications: 2 * 60 * 1000 // 2 minutes
    },
    maxSize: 100 // Maximum number of items in cache
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: true
  },

  // Feature Flags
  features: {
    realtimeVoting: process.env.NEXT_PUBLIC_ENABLE_REALTIME_VOTING !== 'false',
    pushNotifications: process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS !== 'false',
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
    offlineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE !== 'false',
    pwaInstall: process.env.NEXT_PUBLIC_ENABLE_PWA_INSTALL !== 'false'
  },

  // Performance Configuration
  performance: {
    enableVirtualScrolling: true,
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableServiceWorker: true,
    enablePreloading: true,
    maxConcurrentRequests: 6
  },

  // Security Configuration
  security: {
    enableCORS: true,
    enableCSRF: true,
    enableXSSProtection: true,
    enableContentSecurityPolicy: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || []
  },

  // Monitoring Configuration
  monitoring: {
    enableErrorTracking: process.env.NODE_ENV === 'production',
    enablePerformanceMonitoring: process.env.NODE_ENV === 'production',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Development Configuration
  development: {
    enableHotReload: process.env.NODE_ENV === 'development',
    enableDebugMode: process.env.NODE_ENV === 'development',
    enableMockData: process.env.ENABLE_MOCK_DATA === 'true',
    enableTestMode: process.env.ENABLE_TEST_MODE === 'true'
  }
}

// Environment validation
export function validateConfig() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  return true
}

// Feature flag helper
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature]
}

// Environment helper
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}

// API URL helper
export function getApiUrl(endpoint: string): string {
  return `${config.api.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

// Image optimization helper
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = config.upload.imageQuality
): string {
  if (!url) return ''
  
  // If it's already an optimized URL, return as is
  if (url.includes('_next/image')) return url
  
  // For external images, you might want to use a service like Cloudinary
  // For now, return the original URL
  return url
}

// Cache key helper
export function getCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`
}

// Error message helper
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}

// Validation helper
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPassword(password: string): boolean {
  return password.length >= config.auth.passwordMinLength
}

export function isValidImageType(type: string): boolean {
  return config.upload.allowedImageTypes.includes(type)
}

export function isValidImageSize(size: number): boolean {
  return size <= config.upload.maxFileSize
}


