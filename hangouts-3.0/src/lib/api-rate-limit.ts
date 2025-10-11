import { NextRequest, NextResponse } from 'next/server'
import { createRateLimit, rateLimiters } from './rate-limit'
import { createLogger } from './winston-logger'

const logger = createLogger('API_MIDDLEWARE')

// Apply rate limiting based on route patterns
export function withRateLimit(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      // Determine which rate limiter to use based on the route
      let rateLimitedHandler = handler

      // Authentication endpoints - strict rate limiting
      if (pathname.includes('/auth/') || pathname.includes('/signin') || pathname.includes('/signup')) {
        rateLimitedHandler = rateLimiters.auth(handler)
      }
      // Upload endpoints - moderate rate limiting
      else if (pathname.includes('/upload') || pathname.includes('/photos')) {
        rateLimitedHandler = rateLimiters.upload(handler)
      }
      // Sensitive operations - very strict rate limiting
      else if (pathname.includes('/admin') || pathname.includes('/moderation') || pathname.includes('/delete')) {
        rateLimitedHandler = rateLimiters.sensitive(handler)
      }
      // Read operations - lenient rate limiting
      else if (request.method === 'GET' && (pathname.includes('/api/') || pathname.includes('/feed'))) {
        rateLimitedHandler = rateLimiters.read(handler)
      }
      // All other API endpoints - general rate limiting
      else if (pathname.startsWith('/api/')) {
        rateLimitedHandler = rateLimiters.api(handler)
      }

      return await rateLimitedHandler(request)
    } catch (error) {
      logger.error('Rate limit middleware error:', error)
      // Fall back to original handler
      return handler(request)
    }
  }
}

// Specific rate limiters for different API categories
export const apiRateLimiters = {
  // Friends API
  friends: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 friend operations per 15 minutes
    message: 'Too many friend operations, please try again later.',
  }),

  // Hangouts API
  hangouts: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 hangout operations per 15 minutes
    message: 'Too many hangout operations, please try again later.',
  }),

  // Events API
  events: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 event operations per 15 minutes
    message: 'Too many event operations, please try again later.',
  }),

  // Messages API
  messages: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 messages per 15 minutes
    message: 'Too many messages, please try again later.',
  }),

  // Profile API
  profile: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 profile updates per 15 minutes
    message: 'Too many profile updates, please try again later.',
  }),
}

// Apply specific rate limiting to API routes
export function withSpecificRateLimit(
  category: keyof typeof apiRateLimiters,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return apiRateLimiters[category](handler)
}

// Rate limiting for WebSocket connections
export function withWebSocketRateLimit(options: {
  maxConnections?: number
  windowMs?: number
}) {
  const { maxConnections = 10, windowMs = 60 * 1000 } = options
  const connections = new Map<string, number>()

  return function (socketId: string, ip: string): boolean {
    const key = `ws:${ip}`
    const now = Date.now()
    const connectionCount = connections.get(key) || 0

    if (connectionCount >= maxConnections) {
      logger.warn('WebSocket rate limit exceeded:', {
        ip,
        socketId,
        connectionCount,
        maxConnections,
      })
      return false
    }

    connections.set(key, connectionCount + 1)

    // Clean up after window
    setTimeout(() => {
      const current = connections.get(key) || 0
      if (current > 1) {
        connections.set(key, current - 1)
      } else {
        connections.delete(key)
      }
    }, windowMs)

    return true
  }
}

export default withRateLimit
