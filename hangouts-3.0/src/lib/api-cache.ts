/**
 * API Response Caching System
 * 
 * Simple in-memory cache for API responses to reduce database load
 * and improve response times.
 */

import config from './config-enhanced'

interface CacheItem {
  data: any
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheItem>()
  private maxSize = config.cache.maxSize

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    }
  }

  private calculateHitRate(): number {
    // Simple hit rate calculation
    return this.cache.size / this.maxSize
  }
}

// Global cache instance
export const apiCache = new SimpleCache()

/**
 * Cache key generators
 */
export const cacheKeys = {
  hangout: (id: string) => `hangout:${id}`,
  hangoutVotes: (id: string) => `hangout:${id}:votes`,
  userFeed: (userId: string, feedType: string, offset: number) => 
    `feed:${userId}:${feedType}:${offset}`,
  userFriends: (userId: string) => `friends:${userId}`,
  userProfile: (userId: string) => `profile:${userId}`,
  notifications: (userId: string, offset: number) => 
    `notifications:${userId}:${offset}`
}

/**
 * Cache middleware for API routes
 */
export function withCache<T>(
  keyGenerator: (...args: any[]) => string,
  ttlMs: number = 5 * 60 * 1000
) {
  return function(
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function(...args: any[]) {
      const cacheKey = keyGenerator(...args)
      
      // Try to get from cache first
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Execute original method
      const result = await method.apply(this, args)
      
      // Cache the result
      apiCache.set(cacheKey, result, ttlMs)
      
      return result
    }
  }
}

/**
 * Manual cache invalidation helpers
 */
export const cacheInvalidation = {
  // Invalidate hangout-related cache when hangout is updated
  invalidateHangout: (hangoutId: string) => {
    apiCache.delete(cacheKeys.hangout(hangoutId))
    apiCache.delete(cacheKeys.hangoutVotes(hangoutId))
  },

  // Invalidate user-related cache when user data changes
  invalidateUser: (userId: string) => {
    // Clear all user-related cache entries
    for (const [key] of apiCache['cache']) {
      if (key.includes(userId)) {
        apiCache.delete(key)
      }
    }
  },

  // Invalidate feed cache when new content is created
  invalidateFeed: (userId: string) => {
    for (const [key] of apiCache['cache']) {
      if (key.startsWith(`feed:${userId}`)) {
        apiCache.delete(key)
      }
    }
  }
}

/**
 * Cache warming utilities
 */
export const cacheWarming = {
  // Pre-warm frequently accessed data
  warmUserFeed: async (userId: string) => {
    const key = cacheKeys.userFeed(userId, 'home', 0)
    if (!apiCache.get(key)) {
      // This would call the actual feed API
      // Implementation depends on your feed service
    }
  },

  // Warm hangout data for active hangouts
  warmActiveHangouts: async (hangoutIds: string[]) => {
    for (const id of hangoutIds) {
      const key = cacheKeys.hangout(id)
      if (!apiCache.get(key)) {
        // This would call the actual hangout API
        // Implementation depends on your hangout service
      }
    }
  }
}
