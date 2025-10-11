import { PrismaClient } from '@prisma/client'
import { createLogger } from './winston-logger'

const logger = createLogger('DATABASE')

// Database connection pool configuration
const connectionPoolConfig = {
  // Connection pool settings
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
  minConnections: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '5'),
  connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000'),
  idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
  
  // Query settings
  queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
  transactionTimeout: parseInt(process.env.DATABASE_TRANSACTION_TIMEOUT || '60000'),
  
  // Retry settings
  maxRetries: parseInt(process.env.DATABASE_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '1000'),
}

class DatabasePool {
  private prisma: PrismaClient
  private isConnected = false
  private connectionCount = 0
  private maxConnections = connectionPoolConfig.maxConnections
  private minConnections = connectionPoolConfig.minConnections
  private connectionTimeout = connectionPoolConfig.connectionTimeout
  private idleTimeout = connectionPoolConfig.idleTimeout
  private queryTimeout = connectionPoolConfig.queryTimeout
  private transactionTimeout = connectionPoolConfig.transactionTimeout
  private maxRetries = connectionPoolConfig.maxRetries
  private retryDelay = connectionPoolConfig.retryDelay

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    })

    this.setupEventHandlers()
    this.initializeConnection()
  }

  private setupEventHandlers() {
    this.prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Database query:', {
          query: e.query,
          params: e.params,
          duration: e.duration,
          target: e.target,
        })
      }
    })

    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e)
    })

    this.prisma.$on('info', (e) => {
      logger.info('Database info:', e)
    })

    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning:', e)
    })
  }

  private async initializeConnection() {
    try {
      await this.prisma.$connect()
      this.isConnected = true
      this.connectionCount = 1
      logger.info('Database connected successfully')
      
      // Set up connection health monitoring
      this.setupHealthMonitoring()
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      this.isConnected = false
      throw error
    }
  }

  private setupHealthMonitoring() {
    // Health check every 30 seconds
    setInterval(async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`
        if (!this.isConnected) {
          this.isConnected = true
          logger.info('Database connection restored')
        }
      } catch (error) {
        if (this.isConnected) {
          this.isConnected = false
          logger.error('Database connection lost:', error)
        }
      }
    }, 30000)
  }

  // Get database instance with connection management
  async getConnection(): Promise<PrismaClient> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }

    if (this.connectionCount >= this.maxConnections) {
      throw new Error('Maximum database connections exceeded')
    }

    this.connectionCount++
    return this.prisma
  }

  // Release connection
  releaseConnection(): void {
    if (this.connectionCount > 0) {
      this.connectionCount--
    }
  }

  // Execute query with timeout and retry logic
  async executeQuery<T>(
    queryFn: (prisma: PrismaClient) => Promise<T>,
    options: {
      timeout?: number
      retries?: number
      retryDelay?: number
    } = {}
  ): Promise<T> {
    const timeout = options.timeout || this.queryTimeout
    const retries = options.retries || this.maxRetries
    const retryDelay = options.retryDelay || this.retryDelay

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const connection = await this.getConnection()
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Query timeout after ${timeout}ms`))
          }, timeout)
        })

        // Execute query with timeout
        const result = await Promise.race([
          queryFn(connection),
          timeoutPromise,
        ])

        this.releaseConnection()
        return result
      } catch (error) {
        lastError = error as Error
        this.releaseConnection()

        if (attempt < retries) {
          logger.warn(`Query attempt ${attempt + 1} failed, retrying in ${retryDelay}ms:`, error)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          logger.error(`Query failed after ${retries + 1} attempts:`, error)
        }
      }
    }

    throw lastError || new Error('Query execution failed')
  }

  // Execute transaction with timeout and retry logic
  async executeTransaction<T>(
    transactionFn: (prisma: PrismaClient) => Promise<T>,
    options: {
      timeout?: number
      retries?: number
      retryDelay?: number
    } = {}
  ): Promise<T> {
    const timeout = options.timeout || this.transactionTimeout
    const retries = options.retries || this.maxRetries
    const retryDelay = options.retryDelay || this.retryDelay

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const connection = await this.getConnection()
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Transaction timeout after ${timeout}ms`))
          }, timeout)
        })

        // Execute transaction with timeout
        const result = await Promise.race([
          connection.$transaction(transactionFn),
          timeoutPromise,
        ])

        this.releaseConnection()
        return result
      } catch (error) {
        lastError = error as Error
        this.releaseConnection()

        if (attempt < retries) {
          logger.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${retryDelay}ms:`, error)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          logger.error(`Transaction failed after ${retries + 1} attempts:`, error)
        }
      }
    }

    throw lastError || new Error('Transaction execution failed')
  }

  // Get connection pool status
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionCount: this.connectionCount,
      maxConnections: this.maxConnections,
      minConnections: this.minConnections,
      connectionTimeout: this.connectionTimeout,
      idleTimeout: this.idleTimeout,
      queryTimeout: this.queryTimeout,
      transactionTimeout: this.transactionTimeout,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    }
  }

  // Close all connections
  async close(): Promise<void> {
    try {
      await this.prisma.$disconnect()
      this.isConnected = false
      this.connectionCount = 0
      logger.info('Database connections closed')
    } catch (error) {
      logger.error('Error closing database connections:', error)
      throw error
    }
  }
}

// Singleton instance
export const dbPool = new DatabasePool()

// Convenience functions
export const db = {
  // Direct access to Prisma client
  get client() {
    return dbPool.prisma
  },

  // Execute query with connection management
  query: <T>(queryFn: (prisma: PrismaClient) => Promise<T>) => {
    return dbPool.executeQuery(queryFn)
  },

  // Execute transaction with connection management
  transaction: <T>(transactionFn: (prisma: PrismaClient) => Promise<T>) => {
    return dbPool.executeTransaction(transactionFn)
  },

  // Get connection pool status
  getStatus: () => dbPool.getStatus(),

  // Close connections
  close: () => dbPool.close(),
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  responseTime: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    await db.query(async (prisma) => {
      await prisma.$queryRaw`SELECT 1`
    })
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default db
