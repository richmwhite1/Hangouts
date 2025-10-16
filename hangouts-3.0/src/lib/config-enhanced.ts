/**
 * Environment Configuration Management
 * 
 * Centralized configuration with environment-specific settings
 * and validation.
 */

import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // Authentication
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key is required'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  
  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  
  // External services
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  
  // File storage
  UPLOADTHING_SECRET: z.string().optional(),
  UPLOADTHING_APP_ID: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  
  // Feature flags
  ENABLE_REAL_TIME: z.string().transform(val => val === 'true').optional(),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').optional(),
  
  // Rate limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').optional(),
  
  // Cache
  CACHE_TTL_SECONDS: z.string().transform(val => parseInt(val)).optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional()
})

// Validate environment variables
// Parse environment variables with safe fallbacks for health checks
const env = envSchema.safeParse(process.env)
const envData = env.success ? env.data : {
  DATABASE_URL: process.env.DATABASE_URL || '',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '',
  UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET || '',
  UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID || '',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'development'
}

export const config = {
  // App configuration
  app: {
    name: 'Hangouts 3.0',
    version: '1.0.0',
    url: envData.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Database configuration
  database: {
    url: envData.DATABASE_URL,
    maxConnections: 20,
    connectionTimeout: 30000,
    queryTimeout: 10000
  },

  // Authentication configuration
  auth: {
    clerkSecretKey: envData.CLERK_SECRET_KEY,
    clerkPublishableKey: envData.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },

  // API configuration
  api: {
    baseUrl: envData.NEXT_PUBLIC_API_URL || envData.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Real-time configuration
  realtime: {
    enabled: process.env.ENABLE_REAL_TIME === 'true',
    socketUrl: envData.NEXT_PUBLIC_WS_URL,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  },

  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    imageQuality: 0.8,
    imageMaxWidth: 1920,
    imageMaxHeight: 1080,
    uploadThingSecret: envData.UPLOADTHING_SECRET,
    uploadThingAppId: envData.UPLOADTHING_APP_ID
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: {
      hangouts: (parseInt(process.env.CACHE_TTL_SECONDS || '300')) * 1000, // 5 minutes default
      users: 10 * 60 * 1000, // 10 minutes
      friends: 15 * 60 * 1000, // 15 minutes
      notifications: 2 * 60 * 1000, // 2 minutes
      votes: 30 * 1000 // 30 seconds
    },
    maxSize: 1000 // Maximum number of items in cache
  },

  // Rate limiting configuration
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: {
      general: 100,
      auth: 5,
      voting: 10,
      upload: 5,
      feed: 30,
      search: 20
    }
  },

  // Monitoring configuration
  monitoring: {
    sentryDsn: envData.SENTRY_DSN,
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    logLevel: envData.LOG_LEVEL || 'info',
    enablePerformanceMonitoring: true
  },

  // Feature flags
  features: {
    realTimeUpdates: process.env.ENABLE_REAL_TIME === 'true',
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    advancedVoting: true,
    photoSharing: true,
    notifications: true,
    friendSystem: true,
    eventCreation: true
  },

  // Voting system configuration
  voting: {
    consensusThreshold: 70, // 70% consensus required
    maxVotingDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    minParticipants: 2,
    allowMultipleVotes: true,
    allowVoteChanges: true
  },

  // Notification configuration
  notifications: {
    maxPerUser: 100,
    retentionDays: 30,
    batchSize: 50,
    retryAttempts: 3
  }
}

// Configuration validation
export function validateConfig() {
  const errors: string[] = []

  // Check required configurations
  if (!config.database.url) {
    errors.push('Database URL is required')
  }

  if (!config.auth.clerkSecretKey) {
    errors.push('Clerk secret key is required')
  }

  if (!config.auth.clerkPublishableKey) {
    errors.push('Clerk publishable key is required')
  }

  // Check URL formats
  try {
    new URL(config.app.url)
  } catch {
    errors.push('Invalid app URL format')
  }

  if (config.api.baseUrl) {
    try {
      new URL(config.api.baseUrl)
    } catch {
      errors.push('Invalid API base URL format')
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
  }

  return true
}

// Export validated config
export default config
