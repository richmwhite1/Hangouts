// DEPRECATED: This file is being replaced by src/lib/api-handler.ts
// The new system provides better error handling, logging, and consistency
// Migration in progress - new endpoints should use createApiHandler from api-handler.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from './auth'
import { z } from 'zod'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100 // 100 requests per window

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    email: string
    username: string
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string | undefined
  details?: unknown
}

// Authentication middleware - Updated to use Clerk
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Use Clerk authentication instead of JWT
      const user = await getAuthUser()
      
      if (!user) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Authentication required',
          message: 'No valid authentication session found'
        }, { status: 401 })
      }

      // Add user to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        userId: user.userId,
        email: user.email,
        username: user.username
      }

      return await handler(authenticatedReq)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      }, { status: 500 })
    }
  }
}

// Rate limiting middleware
export function withRateLimit(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get client IP with better fallback
      const forwardedFor = req.headers.get('x-forwarded-for')
      const realIp = req.headers.get('x-real-ip')
      const clientId = forwardedFor?.split(',')[0]?.trim() || 
                      realIp || 
                      'localhost'
      
      const now = Date.now()
      const key = `rate_limit_${clientId}`
      
      const current = rateLimitStore.get(key)
      
      if (current) {
        if (now < current.resetTime) {
          if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
            return NextResponse.json<ApiResponse>({
              success: false,
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.'
            }, { 
              status: 429,
              headers: {
                'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
              }
            })
          }
          current.count++
        } else {
          // Reset the counter for a new window
          rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        }
      } else {
        rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      }

      return await handler(req)
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      // Don't fail the request due to rate limiting errors, just log and continue
      console.warn('Rate limiting failed, allowing request to proceed:', error)
      return await handler(req)
    }
  }
}

// Validation middleware
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return function(handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const body = await req.json()
        const validatedData = schema.parse(body)
        
        // Create a new request with the validated data attached
        const modifiedReq = req as NextRequest & { validatedData: T }
        modifiedReq.validatedData = validatedData
        
        return await handler(modifiedReq, validatedData)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Validation failed',
            message: 'The request data is invalid',
            details: error.issues
          }, { status: 400 })
        }
        
        console.error('Validation middleware error:', error)
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Validation failed',
          message: 'An error occurred during validation'
        }, { status: 500 })
      }
    }
  }
}

// Error handling wrapper
export function withErrorHandling(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req)
    } catch (error) {
      console.error('API Error:', error)
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Conflict',
            message: 'A resource with this data already exists'
          }, { status: 409 })
        }
        
        if (error.message.includes('Record to update not found')) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Not found',
            message: 'The requested resource was not found'
          }, { status: 404 })
        }
      }
      
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      }, { status: 500 })
    }
  }
}

// CORS middleware
export function withCORS(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req)
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
  }
}

// Combined middleware for common API routes
export function createApiHandler<T = unknown>(
  handler: (req: AuthenticatedRequest, validatedData?: T) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requireValidation?: z.ZodSchema<T>
    enableRateLimit?: boolean
    enableCORS?: boolean
  } = {}
) {
  const {
    requireAuth = true,
    requireValidation,
    enableRateLimit = true,
    enableCORS = true
  } = options

  // Apply authentication if required (must be before validation to avoid body consumption)
  if (requireAuth) {
    return withErrorHandling(
      withCORS(
        withRateLimit(
          withAuth(handler as any)
        )
      )
    )
  }

  // Apply validation if required
  let middleware: (req: NextRequest) => Promise<NextResponse> = handler as any
  if (requireValidation) {
    middleware = withValidation(requireValidation)(middleware)
  }

  // Apply rate limiting
  if (enableRateLimit) {
    middleware = withRateLimit(middleware)
  }

  // Apply CORS
  if (enableCORS) {
    middleware = withCORS(middleware)
  }

  // Apply error handling
  return withErrorHandling(middleware)
}

// Utility function to create success response
export function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    message: message || undefined
  })
}

// Utility function to create error response
export function createErrorResponse(
  error: string, 
  message: string, 
  status: number = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json<ApiResponse>({
    success: false,
    error,
    message,
    details
  }, { status })
}
