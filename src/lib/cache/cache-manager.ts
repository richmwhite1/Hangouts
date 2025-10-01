import { Redis } from 'ioredis'

export interface CacheConfig {
  defaultTTL: number // seconds
  maxMemory: string
  keyPrefix: string
  enableCompression: boolean
  enableLogging: boolean
}

export interface CacheOptions {
  ttl?: number // seconds
  tags?: string[]
  compress?: boolean
  serialize?: boolean
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  hitRate: number
  memoryUsage: number
}

export class CacheManager {
  private redis: Redis | null = null
  private memoryCache: Map<string, { value: any; expires: number; tags: string[] }> = new Map()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    memoryUsage: 0
  }
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
    this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      // Try to connect to Redis if available
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      })

      this.redis.on('error', (error) => {
        console.warn('Redis connection failed, falling back to memory cache:', error.message)
        this.redis = null
      })

      await this.redis.ping()
      console.log('✅ Redis cache connected successfully')
    } catch (error) {
      console.warn('Redis not available, using memory cache:', error)
      this.redis = null
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key)
    
    try {
      if (this.redis) {
        return await this.getFromRedis<T>(fullKey)
      } else {
        return this.getFromMemory<T>(fullKey)
      }
    } catch (error) {
      console.error('Cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.getFullKey(key)
    const ttl = options.ttl || this.config.defaultTTL
    const tags = options.tags || []
    const compress = options.compress ?? this.config.enableCompression
    const serialize = options.serialize ?? true

    try {
      if (this.redis) {
        return await this.setInRedis(fullKey, value, ttl, compress, serialize)
      } else {
        return this.setInMemory(fullKey, value, ttl, tags)
      }
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key)
    
    try {
      if (this.redis) {
        return await this.deleteFromRedis(fullKey)
      } else {
        return this.deleteFromMemory(fullKey)
      }
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const fullPattern = this.getFullKey(pattern)
    
    try {
      if (this.redis) {
        return await this.deletePatternFromRedis(fullPattern)
      } else {
        return this.deletePatternFromMemory(fullPattern)
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error)
      return 0
    }
  }

  /**
   * Delete all keys with specific tags
   */
  async deleteByTags(tags: string[]): Promise<number> {
    try {
      if (this.redis) {
        return await this.deleteByTagsFromRedis(tags)
      } else {
        return this.deleteByTagsFromMemory(tags)
      }
    } catch (error) {
      console.error('Cache delete by tags error:', error)
      return 0
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key)
    
    try {
      if (this.redis) {
        return await this.existsInRedis(fullKey)
      } else {
        return this.existsInMemory(fullKey)
      }
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    
    if (cached !== null) {
      this.stats.hits++
      return cached
    }

    this.stats.misses++
    const value = await computeFn()
    await this.set(key, value, options)
    return value
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.flushdb()
      } else {
        this.memoryCache.clear()
      }
      
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        memoryUsage: 0
      }
      
      return true
    } catch (error) {
      console.error('Cache clear error:', error)
      return false
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
    this.stats.memoryUsage = this.memoryCache.size
    
    return { ...this.stats }
  }

  /**
   * Warm cache with data
   */
  async warmCache<T>(
    keys: string[],
    computeFn: (key: string) => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      const exists = await this.exists(key)
      if (!exists) {
        const value = await computeFn(key)
        await this.set(key, value, options)
      }
    })

    await Promise.all(promises)
  }

  // Private methods for Redis operations
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redis) return null

    const value = await this.redis.get(key)
    if (value === null) {
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return JSON.parse(value)
  }

  private async setInRedis(
    key: string,
    value: any,
    ttl: number,
    compress: boolean,
    serialize: boolean
  ): Promise<boolean> {
    if (!this.redis) return false

    const serializedValue = serialize ? JSON.stringify(value) : value
    await this.redis.setex(key, ttl, serializedValue)
    this.stats.sets++
    return true
  }

  private async deleteFromRedis(key: string): Promise<boolean> {
    if (!this.redis) return false

    const result = await this.redis.del(key)
    this.stats.deletes++
    return result > 0
  }

  private async deletePatternFromRedis(pattern: string): Promise<number> {
    if (!this.redis) return 0

    const keys = await this.redis.keys(pattern)
    if (keys.length === 0) return 0

    const result = await this.redis.del(...keys)
    this.stats.deletes += result
    return result
  }

  private async deleteByTagsFromRedis(tags: string[]): Promise<number> {
    if (!this.redis) return 0

    const patterns = tags.map(tag => `*:tag:${tag}:*`)
    let totalDeleted = 0

    for (const pattern of patterns) {
      totalDeleted += await this.deletePatternFromRedis(pattern)
    }

    return totalDeleted
  }

  private async existsInRedis(key: string): Promise<boolean> {
    if (!this.redis) return false

    const result = await this.redis.exists(key)
    return result === 1
  }

  // Private methods for memory operations
  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    if (Date.now() > item.expires) {
      this.memoryCache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return item.value
  }

  private setInMemory(key: string, value: any, ttl: number, tags: string[]): boolean {
    const expires = Date.now() + (ttl * 1000)
    this.memoryCache.set(key, { value, expires, tags })
    this.stats.sets++
    return true
  }

  private deleteFromMemory(key: string): boolean {
    const deleted = this.memoryCache.delete(key)
    if (deleted) {
      this.stats.deletes++
    }
    return deleted
  }

  private deletePatternFromMemory(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let deleted = 0

    for (const [key] of this.memoryCache) {
      if (regex.test(key)) {
        this.memoryCache.delete(key)
        deleted++
        this.stats.deletes++
      }
    }

    return deleted
  }

  private deleteByTagsFromMemory(tags: string[]): number {
    let deleted = 0

    for (const [key, item] of this.memoryCache) {
      if (tags.some(tag => item.tags.includes(tag))) {
        this.memoryCache.delete(key)
        deleted++
        this.stats.deletes++
      }
    }

    return deleted
  }

  private existsInMemory(key: string): boolean {
    const item = this.memoryCache.get(key)
    return item ? Date.now() <= item.expires : false
  }

  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`
  }

  /**
   * Cleanup expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = Date.now()
    for (const [key, item] of this.memoryCache) {
      if (now > item.expires) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * Start cleanup interval for memory cache
   */
  startCleanupInterval(intervalMs: number = 60000): void {
    setInterval(() => {
      this.cleanupMemoryCache()
    }, intervalMs)
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

// Default cache configuration
const defaultConfig: CacheConfig = {
  defaultTTL: 300, // 5 minutes
  maxMemory: '100MB',
  keyPrefix: 'hangouts',
  enableCompression: false,
  enableLogging: true
}

// Export singleton instance
export const cacheManager = new CacheManager(defaultConfig)

// Start cleanup interval for memory cache
cacheManager.startCleanupInterval()









