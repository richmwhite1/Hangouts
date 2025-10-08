import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from './auth'
import { db } from './db'
import { rbac, Permission } from './rbac'
import { auditLogger } from './audit-logger'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuthenticatedRequest extends NextRequest {
  user: {
    userId: string
    email: string
    username: string
    role?: string
  }
  params: Record<string, string>
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  timestamp: string
  requestId: string
}

export interface ApiConfig {
  requireAuth?: boolean
  requiredPermissions?: Permission[]
  rateLimit?: {
    limit: number
    windowMs: number
  }
  validateInput?: z.ZodSchema
  enableCORS?: boolean
  enableLogging?: boolean
  enableAudit?: boolean
  version?: string
}

export interface RateLimitEntry {
  count: number
  resetTime: number
}

// ============================================================================
// RATE LIMITING STORAGE
// ============================================================================

const rateLimitStore = new Map<string, RateLimitEntry>()

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return ip
}

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}

function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  requestId: string = generateRequestId()
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId
  })
}

function createErrorResponse(
  error: string,
  message: string,
  status: number = 400,
  code?: string,
  requestId: string = generateRequestId()
): NextResponse<ApiResponse> {
  return NextResponse.json<ApiResponse>({
    success: false,
    error,
    message,
    code,
    timestamp: new Date().toISOString(),
    requestId
  }, { status })
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

async function withRateLimit(
  request: NextRequest, 
  config: ApiConfig
): Promise<NextResponse | null> {
  if (!config.rateLimit) return null

  const clientId = getClientId(request)
  const rateLimitKey = `${clientId}:${request.nextUrl.pathname}`
  
  if (!checkRateLimit(rateLimitKey, config.rateLimit.limit, config.rateLimit.windowMs)) {
    return createErrorResponse(
      'Rate limit exceeded',
      `Too many requests. Limit: ${config.rateLimit.limit} per ${config.rateLimit.windowMs}ms`,
      429,
      'RATE_LIMIT_EXCEEDED'
    )
  }

  return null
}

async function withAuth(
  request: NextRequest, 
  config: ApiConfig
): Promise<{ response: NextResponse | null; user?: any }> {
  if (!config.requireAuth) {
    return { response: null }
  }

  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      response: createErrorResponse(
        'Authentication required',
        'No valid authorization token provided',
        401,
        'MISSING_TOKEN'
      )
    }
  }

  const token = authHeader.substring(7)
  
  try {
    console.log('Auth middleware: Verifying token')
    const payload = verifyToken(token)
    console.log('Auth middleware: Token payload:', payload)
    
    if (!payload) {
      console.log('Auth middleware: Invalid token')
      return {
        response: createErrorResponse(
          'Invalid token',
          'The provided token is invalid or expired',
          401,
          'INVALID_TOKEN'
        )
      }
    }

    // Get user role from database
    console.log('Auth middleware: Fetching user from database')
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, name: true, role: true, isActive: true }
    })
    console.log('Auth middleware: User from database:', user)

    if (!user || !user.isActive) {
      console.log('Auth middleware: User not found or inactive')
      return {
        response: createErrorResponse(
          'User not found',
          'User account not found or inactive',
          401,
          'USER_NOT_FOUND'
        )
      }
    }

    console.log('Auth middleware: User found:', user)
    return {
      response: null,
      user: {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return {
      response: createErrorResponse(
        'Authentication failed',
        'An error occurred during authentication',
        500,
        'AUTH_ERROR'
      )
    }
  }
}

async function withAuthorization(
  request: NextRequest,
  user: any,
  config: ApiConfig
): Promise<{ response: NextResponse | null }> {
  if (!config.requiredPermissions || config.requiredPermissions.length === 0) {
    return { response: null }
  }

  try {
    // Check if user has required permissions
    const hasPermission = await rbac.hasAnyPermission(user.userId, config.requiredPermissions)
    
    // Log permission check
    if (config.enableAudit) {
      await auditLogger.logPermissionCheck(
        user.userId,
        config.requiredPermissions.join(','),
        hasPermission,
        undefined,
        undefined,
        hasPermission ? 'Permission granted' : 'Insufficient permissions',
        getClientId(request),
        request.headers.get('user-agent') || undefined
      )
    }

    if (!hasPermission) {
      return {
        response: createErrorResponse(
          'Insufficient permissions',
          'You do not have permission to perform this action',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      }
    }

    return { response: null }
  } catch (error) {
    console.error('Authorization middleware error:', error)
    return {
      response: createErrorResponse(
        'Authorization failed',
        'An error occurred during authorization',
        500,
        'AUTH_ERROR'
      )
    }
  }
}

async function withValidation(
  request: NextRequest,
  config: ApiConfig
): Promise<{ response: NextResponse | null; validatedData?: any }> {
  if (!config.validateInput) {
    return { response: null }
  }

  try {
    const body = await request.json()
    const validatedData = config.validateInput.parse(body)
    return { response: null, validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        response: createErrorResponse(
          'Validation error',
          'Invalid input data',
          400,
          'VALIDATION_ERROR',
          generateRequestId()
        )
      }
    }

    return {
      response: createErrorResponse(
        'Invalid JSON',
        'Request body must be valid JSON',
        400,
        'INVALID_JSON'
      )
    }
  }
}

function withCORS(
  request: NextRequest,
  config: ApiConfig
): NextResponse | null {
  if (!config.enableCORS) return null

  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.RAILWAY_PUBLIC_DOMAIN || process.env.VERCEL_URL || 'https://your-app.railway.app',
    'https://hangouts-production-adc4.up.railway.app',
    'https://hangouts-3-0.vercel.app',
    'https://hangouts-3-0-git-main-richardwhite.vercel.app',
    'https://hangouts-3-0-git-develop-richardwhite.vercel.app'
  ]

  // Allow all origins in development
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  // In production, check against allowed origins
  if (origin && !allowedOrigins.includes(origin)) {
    console.log('CORS Error: Origin not allowed:', origin)
    console.log('Allowed origins:', allowedOrigins)
    return createErrorResponse(
      'CORS error',
      'Origin not allowed',
      403,
      'CORS_ERROR'
    )
  }

  return null
}

async function withLogging(
  request: NextRequest,
  response: NextResponse,
  requestId: string,
  config: ApiConfig
): Promise<void> {
  if (!config.enableLogging) return

  const logData = {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: getClientId(request),
    status: response.status,
    timestamp: new Date().toISOString()
  }

  console.log('API Request:', JSON.stringify(logData, null, 2))
}

// ============================================================================
// MAIN API HANDLER FACTORY
// ============================================================================

export function createApiHandler<T = unknown>(
  handler: (request: AuthenticatedRequest, validatedData?: any) => Promise<NextResponse<ApiResponse<T>>>,
  config: ApiConfig = {}
) {
  return async (request: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    const requestId = generateRequestId()
    
    try {
      console.log('createApiHandler: Starting request processing')
      
      // Handle CORS
      const corsResponse = withCORS(request, config)
      if (corsResponse) {
        console.log('createApiHandler: CORS response returned')
        return corsResponse
      }

      // Handle rate limiting
      const rateLimitResponse = await withRateLimit(request, config)
      if (rateLimitResponse) {
        console.log('createApiHandler: Rate limit response returned')
        return rateLimitResponse
      }

      // Handle authentication
      console.log('createApiHandler: Calling withAuth')
      const { response: authResponse, user } = await withAuth(request, config)
      console.log('createApiHandler: Auth result:', { authResponse: !!authResponse, user: !!user, userType: typeof user })
      if (authResponse) {
        console.log('createApiHandler: Auth response returned')
        return authResponse
      }

      // Handle authorization
      const { response: authzResponse } = await withAuthorization(request, user!, config)
      if (authzResponse) return authzResponse

      // Handle input validation
      const { response: validationResponse, validatedData } = await withValidation(request, config)
      if (validationResponse) return validationResponse

      // Add user to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = user!

      // Add params to request (for Next.js dynamic routes)
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/').filter(Boolean)
      const params: Record<string, string> = {}
      
      // Extract dynamic route parameters
      if (pathSegments.includes('hangouts') && pathSegments.length > 1) {
        const hangoutIndex = pathSegments.indexOf('hangouts')
        if (hangoutIndex !== -1 && pathSegments[hangoutIndex + 1]) {
          params.id = pathSegments[hangoutIndex + 1]
        }
        if (pathSegments.includes('polls') && pathSegments.length > hangoutIndex + 2) {
          const pollIndex = pathSegments.indexOf('polls')
          if (pollIndex !== -1 && pathSegments[pollIndex + 1]) {
            params.pollId = pathSegments[pollIndex + 1]
          }
        }
      }
      
      authenticatedRequest.params = params

      // Call the actual handler
      const response = await handler(authenticatedRequest, validatedData)

      // Log the request
      await withLogging(request, response, requestId, config)

      return response

    } catch (error) {
      console.error('API Handler Error:', error)
      
      const errorResponse = createErrorResponse(
        'Internal server error',
        'An unexpected error occurred',
        500,
        'INTERNAL_ERROR',
        requestId
      )

      await withLogging(request, errorResponse, requestId, config)
      return errorResponse
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

// These are already defined above as internal functions
// Re-export them for external use
export { createSuccessResponse, createErrorResponse }

// ============================================================================
// COMMON CONFIGURATIONS
// ============================================================================

export const API_CONFIGS = {
  // Public endpoints (no auth required)
  PUBLIC: {
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 100, windowMs: 60000 } // 100 requests per minute
  },

  // Authenticated endpoints
  AUTHENTICATED: {
    requireAuth: true,
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 200, windowMs: 60000 } // 200 requests per minute
  },

  // Admin endpoints
  ADMIN: {
    requireAuth: true,
    requiredPermissions: ['admin:access'],
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 50, windowMs: 60000 } // 50 requests per minute
  },

  // Upload endpoints
  UPLOAD: {
    requireAuth: true,
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 10, windowMs: 60000 } // 10 uploads per minute
  },

  // Hangout endpoints
  HANGOUT: {
    requireAuth: true,
    requiredPermissions: ['hangout:read'],
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 100, windowMs: 60000 }
  },

  // Friend endpoints
  FRIEND: {
    requireAuth: true,
    requiredPermissions: ['friend:manage'],
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 50, windowMs: 60000 }
  },

  // Group endpoints
  GROUP: {
    requireAuth: true,
    requiredPermissions: ['group:read'],
    enableCORS: true,
    enableLogging: true,
    enableAudit: true,
    rateLimit: { limit: 50, windowMs: 60000 }
  }
} as const
