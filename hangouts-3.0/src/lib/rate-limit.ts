import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from './winston-logger'

const logger = createLogger('RATE_LIMIT')

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum number of requests per window
  message?: string
  statusCode?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest) => string
  skip?: (request: NextRequest) => boolean
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key)
      }
    }
  }

  get(key: string): RateLimitInfo | null {
    const entry = this.store.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now > entry.resetTime) {
      this.store.delete(key)
      return null
    }

    return {
      limit: 0, // Will be set by the rate limiter
      remaining: Math.max(0, 0 - entry.count), // Will be calculated properly
      reset: entry.resetTime,
    }
  }

  set(key: string, count: number, resetTime: number) {
    this.store.set(key, { count, resetTime })
  }

  increment(key: string, windowMs: number): RateLimitInfo {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      const resetTime = now + windowMs
      this.store.set(key, { count: 1, resetTime })
      return {
        limit: 0, // Will be set by the rate limiter
        remaining: 0, // Will be calculated properly
        reset: resetTime,
      }
    }

    // Increment existing entry
    entry.count++
    this.store.set(key, entry)
    return {
      limit: 0, // Will be set by the rate limiter
      remaining: 0, // Will be calculated properly
      reset: entry.resetTime,
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Global store instance
const store = new RateLimitStore()

function defaultKeyGenerator(request: NextRequest): string {
  // Use IP address as default key
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return ip
}

export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
  } = options

  return function (handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function (request: NextRequest): Promise<NextResponse> {
      // Skip rate limiting if skip function returns true
      if (skip(request)) {
        return handler(request)
      }

      try {
        const key = keyGenerator(request)
        const rateLimitInfo = store.increment(key, windowMs)

        // Calculate remaining requests
        const remaining = Math.max(0, max - rateLimitInfo.count)
        const resetTime = rateLimitInfo.reset

        // Add rate limit headers
        const headers = new Headers()
        headers.set('X-RateLimit-Limit', max.toString())
        headers.set('X-RateLimit-Remaining', remaining.toString())
        headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())

        // Check if limit exceeded
        if (rateLimitInfo.count > max) {
          logger.warn('Rate limit exceeded:', {
            key,
            count: rateLimitInfo.count,
            max,
            ip: request.ip,
            userAgent: request.headers.get('user-agent'),
            url: request.url,
          })

          headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString())

          return new NextResponse(
            JSON.stringify({
              error: message,
              retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            }),
            {
              status: statusCode,
              headers,
            }
          )
        }

        // Execute the handler
        const response = await handler(request)

        // Add rate limit headers to successful response
        response.headers.set('X-RateLimit-Limit', max.toString())
        response.headers.set('X-RateLimit-Remaining', remaining.toString())
        response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())

        return response
      } catch (error) {
        logger.error('Rate limit middleware error:', error)
        // Fall back to original handler
        return handler(request)
      }
    }
  }
}

// Predefined rate limiters for common use cases
export const rateLimiters = {
  // General API rate limiting
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
  }),

  // Strict rate limiting for auth endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  }),

  // Moderate rate limiting for upload endpoints
  upload: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Too many uploads, please try again later.',
  }),

  // Lenient rate limiting for read operations
  read: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many read requests, please try again later.',
  }),

  // Very strict rate limiting for sensitive operations
  sensitive: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many sensitive operations, please try again later.',
  }),
}

// Rate limit by user ID (for authenticated requests)
export function createUserRateLimit(options: RateLimitOptions) {
  return createRateLimit({
    ...options,
    keyGenerator: (request: NextRequest) => {
      // Try to get user ID from headers or auth
      const userId = request.headers.get('x-user-id') || 
                    request.headers.get('authorization')?.split(' ')[1] || 
                    'anonymous'
      return `user:${userId}`
    },
  })
}

// Rate limit by IP address
export function createIPRateLimit(options: RateLimitOptions) {
  return createRateLimit({
    ...options,
    keyGenerator: defaultKeyGenerator,
  })
}

// Slow down middleware (gradually increase delay for repeated requests)
export function createSlowDown(options: {
  windowMs?: number
  delayAfter?: number
  delayMs?: number
  maxDelayMs?: number
}) {
  const {
    windowMs = 15 * 60 * 1000,
    delayAfter = 50,
    delayMs = 500,
    maxDelayMs = 20000,
  } = options

  return function (handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const key = defaultKeyGenerator(request)
      const rateLimitInfo = store.increment(key, windowMs)

      if (rateLimitInfo.count > delayAfter) {
        const delay = Math.min(
          (rateLimitInfo.count - delayAfter) * delayMs,
          maxDelayMs
        )

        logger.info('Slowing down request:', {
          key,
          count: rateLimitInfo.count,
          delay,
        })

        await new Promise(resolve => setTimeout(resolve, delay))
      }

      return handler(request)
    }
  }
}

export default createRateLimit
