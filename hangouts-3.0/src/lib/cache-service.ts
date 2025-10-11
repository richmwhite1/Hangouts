import Redis from 'ioredis'
import { createLogger } from './winston-logger'

const logger = createLogger('CACHE')

interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
  serialize?: boolean
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
}

class CacheService {
  private redis: Redis | null = null
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  }
  private isConnected = false

  constructor() {
    this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING
      
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 10000,
          commandTimeout: 5000,
        })

        this.redis.on('connect', () => {
          this.isConnected = true
          logger.info('Redis connected successfully')
        })

        this.redis.on('error', (error) => {
          this.isConnected = false
          this.stats.errors++
          logger.error('Redis connection error:', error)
        })

        this.redis.on('close', () => {
          this.isConnected = false
          logger.warn('Redis connection closed')
        })

        // Connect to Redis
        await this.redis.connect()
      } else {
        logger.warn('No Redis URL provided, caching disabled')
      }
    } catch (error) {
      logger.error('Failed to initialize Redis:', error)
      this.redis = null
    }
  }

  private getKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || 'hangouts'
    return `${keyPrefix}:${key}`
  }

  private serialize(value: any): string {
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  private deserialize(value: string, shouldDeserialize?: boolean): any {
    if (!shouldDeserialize) return value
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      this.stats.misses++
      return null
    }

    try {
      const cacheKey = this.getKey(key, options.prefix)
      const value = await this.redis.get(cacheKey)
      
      if (value === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return this.deserialize(value, options.serialize) as T
    } catch (error) {
      this.stats.errors++
      logger.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false
    }

    try {
      const cacheKey = this.getKey(key, options.prefix)
      const serializedValue = this.serialize(value)
      
      if (options.ttl) {
        await this.redis.setex(cacheKey, options.ttl, serializedValue)
      } else {
        await this.redis.set(cacheKey, serializedValue)
      }

      this.stats.sets++
      return true
    } catch (error) {
      this.stats.errors++
      logger.error('Cache set error:', error)
      return false
    }
  }

  async del(key: string, prefix?: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false
    }

    try {
      const cacheKey = this.getKey(key, prefix)
      await this.redis.del(cacheKey)
      this.stats.deletes++
      return true
    } catch (error) {
      this.stats.errors++
      logger.error('Cache delete error:', error)
      return false
    }
  }

  async exists(key: string, prefix?: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false
    }

    try {
      const cacheKey = this.getKey(key, prefix)
      const result = await this.redis.exists(cacheKey)
      return result === 1
    } catch (error) {
      this.stats.errors++
      logger.error('Cache exists error:', error)
      return false
    }
  }

  async flush(prefix?: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false
    }

    try {
      if (prefix) {
        const pattern = this.getKey('*', prefix)
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } else {
        await this.redis.flushall()
      }
      return true
    } catch (error) {
      this.stats.errors++
      logger.error('Cache flush error:', error)
      return false
    }
  }

  async getStats(): Promise<CacheStats & { connected: boolean }> {
    return {
      ...this.stats,
      connected: this.isConnected
    }
  }

  // Cache decorator for methods
  static cache<T extends any[], R>(
    keyGenerator: (...args: T) => string,
    options: CacheOptions = {}
  ) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value

      descriptor.value = async function (...args: T): Promise<R> {
        const cacheKey = keyGenerator(...args)
        const cache = cacheService

        // Try to get from cache first
        const cached = await cache.get<R>(cacheKey, options)
        if (cached !== null) {
          return cached
        }

        // Execute the original method
        const result = await method.apply(this, args)

        // Cache the result
        await cache.set(cacheKey, result, options)

        return result
      }

      return descriptor
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()

// Convenience functions
export const cache = {
  get: <T>(key: string, options?: CacheOptions) => cacheService.get<T>(key, options),
  set: <T>(key: string, value: T, options?: CacheOptions) => cacheService.set(key, value, options),
  del: (key: string, prefix?: string) => cacheService.del(key, prefix),
  exists: (key: string, prefix?: string) => cacheService.exists(key, prefix),
  flush: (prefix?: string) => cacheService.flush(prefix),
  stats: () => cacheService.getStats(),
}

// Cache decorator
export const Cache = CacheService.cache

export default cacheService
