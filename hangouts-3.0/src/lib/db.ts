import { PrismaClient } from '@prisma/client'

import { logger } from '@/lib/logger'
import { emitNotificationEvent } from '@/lib/server/notification-emitter'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with optimized configuration
const createPrismaClient = () => {
  let databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl || databaseUrl.trim() === '') {
    const isProduction = process.env.NODE_ENV === 'production'
    const errorMsg = isProduction
      ? 'DATABASE_URL environment variable is required but not set in Railway. Please ensure your PostgreSQL service is linked to your app service in Railway dashboard.'
      : 'DATABASE_URL environment variable is required but not set. Please check your .env.local file and ensure DATABASE_URL is configured. For local development, you can use: DATABASE_URL="postgresql://username@localhost:5432/database_name"'
    logger.error('Database configuration error:', { error: errorMsg, hasEnvVar: !!process.env.DATABASE_URL, isProduction })
    throw new Error(errorMsg)
  }
  
  // Validate DATABASE_URL format for production (must be PostgreSQL)
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction && !databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    const errorMsg = `Invalid DATABASE_URL format in production. Expected postgresql:// or postgres://, but got: ${databaseUrl.substring(0, 50)}... Please check your Railway PostgreSQL service is properly linked and DATABASE_URL is set correctly.`
    logger.error('Database URL format error:', { 
      error: errorMsg, 
      urlPrefix: databaseUrl.substring(0, 50),
      isProduction 
    })
    throw new Error(errorMsg)
  }
  
  // Only normalize SQLite file URLs in development
  // PostgreSQL URLs (postgresql://) should pass through unchanged
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    // This is likely a SQLite database for local development
    if (databaseUrl.startsWith('file:')) {
      // SQLite URL is already correct
    } else if (databaseUrl.includes('dev.db') || databaseUrl.includes('.db')) {
      // If it's a relative path, convert to absolute
      const path = require('path')
      const dbPath = path.isAbsolute(databaseUrl) 
        ? databaseUrl 
        : path.join(process.cwd(), databaseUrl.replace(/^file:/, ''))
      databaseUrl = `file:${dbPath}`
    }
  }
  
  // Log connection info (sanitized)
  const sanitizedUrl = databaseUrl.startsWith('postgresql') 
    ? databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
    : 'SQLite local database'
  logger.info('Database connection configured:', { type: databaseUrl.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite', sanitizedUrl })
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Emit real-time events when notifications are created anywhere in the system
db.$use(async (params, next) => {
  const result = await next(params)

  if (params.model === 'Notification' && params.action === 'create' && result) {
    emitNotificationEvent(result.userId, {
      type: 'created',
      notification: result
    })
  }

  return result
})

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect()
})

process.on('SIGINT', async () => {
  await db.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await db.$disconnect()
  process.exit(0)
})

