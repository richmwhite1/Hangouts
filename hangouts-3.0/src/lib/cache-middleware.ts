import { NextRequest, NextResponse } from 'next/server'
import { cache } from './cache-service'
import { createLogger } from './winston-logger'

const logger = createLogger('CACHE_MIDDLEWARE')

interface CacheMiddlewareOptions {
  ttl?: number // Time to live in seconds
  keyGenerator?: (request: NextRequest) => string
  skipCache?: (request: NextRequest) => boolean
  prefix?: string
}

export function withCache(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
    prefix = 'api'
  } = options

  return function (handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function (request: NextRequest): Promise<NextResponse> {
      // Skip cache for non-GET requests or if skipCache returns true
      if (request.method !== 'GET' || skipCache(request)) {
        return handler(request)
      }

      try {
        const cacheKey = keyGenerator(request)
        
        // Try to get from cache
        const cached = await cache.get(cacheKey, { ttl, prefix })
        if (cached !== null) {
          logger.debug('Cache hit for API route:', { key: cacheKey })
          return NextResponse.json(cached)
        }

        // Execute the handler
        const response = await handler(request)
        
        // Only cache successful responses
        if (response.status === 200) {
          const data = await response.clone().json()
          await cache.set(cacheKey, data, { ttl, prefix })
          logger.debug('Cached API response:', { key: cacheKey })
        }

        return response
      } catch (error) {
        logger.error('Cache middleware error:', error)
        // Fall back to original handler
        return handler(request)
      }
    }
  }
}

function defaultKeyGenerator(request: NextRequest): string {
  const url = new URL(request.url)
  const pathname = url.pathname
  const searchParams = url.searchParams.toString()
  
  // Create a cache key from pathname and query parameters
  const key = searchParams ? `${pathname}?${searchParams}` : pathname
  
  // Hash the key to avoid long cache keys
  return hashString(key)
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate cache by pattern
  invalidatePattern: async (pattern: string, prefix?: string) => {
    try {
      await cache.flush(prefix)
      logger.info('Cache invalidated by pattern:', { pattern, prefix })
    } catch (error) {
      logger.error('Cache invalidation error:', error)
    }
  },

  // Invalidate specific keys
  invalidateKeys: async (keys: string[], prefix?: string) => {
    try {
      for (const key of keys) {
        await cache.del(key, prefix)
      }
      logger.info('Cache keys invalidated:', { keys, prefix })
    } catch (error) {
      logger.error('Cache invalidation error:', error)
    }
  },

  // Invalidate user-specific cache
  invalidateUserCache: async (userId: string) => {
    try {
      const patterns = [
        `user:${userId}`,
        `friends:${userId}`,
        `hangouts:${userId}`,
        `events:${userId}`,
        `profile:${userId}`
      ]
      
      for (const pattern of patterns) {
        await cache.del(pattern)
      }
      
      logger.info('User cache invalidated:', { userId })
    } catch (error) {
      logger.error('User cache invalidation error:', error)
    }
  }
}

export default withCache
