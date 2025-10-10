"use client"

interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items
  storage?: 'memory' | 'sessionStorage' | 'localStorage'
}

export class Cache<T> {
  private cache = new Map<string, CacheItem<T>>()
  private options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize || 100,
      storage: options.storage || 'memory'
    }
  }

  set(key: string, value: T, ttl?: number): void {
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl
    }

    // Remove oldest items if cache is full
    if (this.cache.size >= this.options.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, item)

    // Persist to storage if not memory
    if (this.options.storage !== 'memory') {
      this.persistToStorage(key, item)
    }
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      // Try to load from storage
      if (this.options.storage !== 'memory') {
        const storedItem = this.loadFromStorage(key)
        if (storedItem) {
          this.cache.set(key, storedItem)
          return this.checkExpiry(key, storedItem)
        }
      }
      return null
    }

    return this.checkExpiry(key, item)
  }

  private checkExpiry(key: string, item: CacheItem<T>): T | null {
    const now = Date.now()
    const isExpired = now - item.timestamp > item.ttl

    if (isExpired) {
      this.cache.delete(key)
      if (this.options.storage !== 'memory') {
        this.removeFromStorage(key)
      }
      return null
    }

    return item.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.cache.delete(key)
    if (this.options.storage !== 'memory') {
      this.removeFromStorage(key)
    }
  }

  clear(): void {
    this.cache.clear()
    if (this.options.storage !== 'memory') {
      this.clearStorage()
    }
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  private persistToStorage(key: string, item: CacheItem<T>): void {
    try {
      const storageKey = `cache_${key}`
      const data = JSON.stringify(item)
      
      if (this.options.storage === 'sessionStorage') {
        sessionStorage.setItem(storageKey, data)
      } else if (this.options.storage === 'localStorage') {
        localStorage.setItem(storageKey, data)
      }
    } catch (error) {
      console.warn('Failed to persist to storage:', error)
    }
  }

  private loadFromStorage(key: string): CacheItem<T> | null {
    try {
      const storageKey = `cache_${key}`
      let data: string | null = null
      
      if (this.options.storage === 'sessionStorage') {
        data = sessionStorage.getItem(storageKey)
      } else if (this.options.storage === 'localStorage') {
        data = localStorage.getItem(storageKey)
      }

      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error)
    }
    
    return null
  }

  private removeFromStorage(key: string): void {
    try {
      const storageKey = `cache_${key}`
      
      if (this.options.storage === 'sessionStorage') {
        sessionStorage.removeItem(storageKey)
      } else if (this.options.storage === 'localStorage') {
        localStorage.removeItem(storageKey)
      }
    } catch (error) {
      console.warn('Failed to remove from storage:', error)
    }
  }

  private clearStorage(): void {
    try {
      if (this.options.storage === 'sessionStorage') {
        Object.keys(sessionStorage)
          .filter(key => key.startsWith('cache_'))
          .forEach(key => sessionStorage.removeItem(key))
      } else if (this.options.storage === 'localStorage') {
        Object.keys(localStorage)
          .filter(key => key.startsWith('cache_'))
          .forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.warn('Failed to clear storage:', error)
    }
  }
}

// Global cache instances
export const memoryCache = new Cache({ storage: 'memory' })
export const sessionCache = new Cache({ storage: 'sessionStorage', ttl: 30 * 60 * 1000 }) // 30 minutes
export const persistentCache = new Cache({ storage: 'localStorage', ttl: 24 * 60 * 60 * 1000 }) // 24 hours

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    cache?: Cache<any>
    keyGenerator?: (...args: Parameters<T>) => string
    ttl?: number
  } = {}
): T {
  const cache = options.cache || memoryCache
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args))

  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    const cached = cache.get(key)
    
    if (cached !== null) {
      return cached
    }

    const result = fn(...args)
    
    // Handle promises
    if (result instanceof Promise) {
      return result.then((resolved) => {
        cache.set(key, resolved, options.ttl)
        return resolved
      })
    }

    cache.set(key, result, options.ttl)
    return result
  }) as T
}

// React hook for caching
export function useCache<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}) {
  const cache = new Cache<T>(options)
  
  const get = async (): Promise<T> => {
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    const result = await fetcher()
    cache.set(key, result)
    return result
  }

  const invalidate = () => {
    cache.delete(key)
  }

  const clear = () => {
    cache.clear()
  }

  return { get, invalidate, clear, has: () => cache.has(key) }
}

// Additional exports for services
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  VERY_LONG: 7 * 24 * 60 * 60 * 1000 // 7 days
}

export const CACHE_TAGS = {
  USER: 'user',
  HANGOUT: 'hangout',
  EVENT: 'event',
  FRIEND: 'friend',
  GROUP: 'group',
  COMMENT: 'comment',
  POLL: 'poll'
}

// Query cache service
export class QueryCacheService {
  private cache = new Cache<any>({ ttl: CACHE_TTL.MEDIUM })

  set(key: string, value: any, ttl?: number) {
    this.cache.set(key, value, ttl)
  }

  get(key: string) {
    return this.cache.get(key)
  }

  invalidate(pattern?: string) {
    if (pattern) {
      const keys = this.cache.keys().filter(key => key.includes(pattern))
      keys.forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }
}

// Cache utilities
export class CacheUtils {
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`
  }

  static generateUserKey(userId: string, suffix: string): string {
    return this.generateKey('user', userId, suffix)
  }

  static generateHangoutKey(hangoutId: string, suffix: string): string {
    return this.generateKey('hangout', hangoutId, suffix)
  }
}

// Default query cache instance
export const queryCache = new QueryCacheService()

