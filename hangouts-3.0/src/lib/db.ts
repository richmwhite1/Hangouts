import { PrismaClient } from '@prisma/client'

import { logger } from '@/lib/logger'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with optimized configuration
const createPrismaClient = () => {
  let databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
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

