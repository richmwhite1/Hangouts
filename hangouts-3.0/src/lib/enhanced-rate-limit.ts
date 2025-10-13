/**
 * Enhanced Rate Limiting System
 * 
 * Protects API endpoints from abuse and ensures fair usage
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return true
    }

    if (entry.count >= config.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  getRemainingRequests(key: string, config: RateLimitConfig): number {
    const entry = this.store.get(key)
    if (!entry) return config.maxRequests
    
    const now = Date.now()
    if (now > entry.resetTime) return config.maxRequests
    
    return Math.max(0, config.maxRequests - entry.count)
  }

  getResetTime(key: string): number {
    const entry = this.store.get(key)
    return entry ? entry.resetTime : 0
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

/**
 * Rate limiting configurations for different endpoints
 */
export const rateLimitConfigs = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },

  // Voting endpoints
  voting: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  },

  // Feed endpoints
  feed: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20
  }
}

/**
 * Generate rate limit key from request
 */
function getRateLimitKey(request: NextRequest, config: string): string {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // For authenticated requests, use user ID instead of IP
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from token (simplified)
    const token = authHeader.replace('Bearer ', '')
    return `${config}:user:${token.slice(0, 10)}` // Use first 10 chars as identifier
  }
  
  return `${config}:ip:${ip}`
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(config: RateLimitConfig) {
  return function(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      const key = getRateLimitKey(request, propertyName)
      
      if (!rateLimiter.isAllowed(key, config)) {
        const remaining = rateLimiter.getRemainingRequests(key, config)
        const resetTime = rateLimiter.getResetTime(key)
        
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            remaining
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': resetTime.toString()
            }
          }
        )
      }

      // Execute original method
      const response = await method.apply(this, [request, ...args])
      
      // Add rate limit headers to response
      const remaining = rateLimiter.getRemainingRequests(key, config)
      const resetTime = rateLimiter.getResetTime(key)
      
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', resetTime.toString())
      
      return response
    }
  }
}

/**
 * Simple rate limiting function for direct use
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; response?: NextResponse } {
  const key = getRateLimitKey(request, 'general')
  
  if (!rateLimiter.isAllowed(key, config)) {
    const remaining = rateLimiter.getRemainingRequests(key, config)
    const resetTime = rateLimiter.getResetTime(key)
    
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          remaining
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      )
    }
  }
  
  return { allowed: true }
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimiter() {
  if (rateLimiter['cleanupInterval']) {
    clearInterval(rateLimiter['cleanupInterval'])
  }
}
