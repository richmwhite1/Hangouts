/**
 * Standardized API Error Handler
 * Provides consistent error handling across all API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSuccessResponse, createErrorResponse } from './api-response'
import { ValidationError } from './validation'

import { logger } from '@/lib/logger'
export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class ValidationApiError extends ApiError {
  public readonly validationErrors: ValidationError[]

  constructor(validationErrors: ValidationError[]) {
    super('Validation failed', 422, 'VALIDATION_ERROR')
    this.name = 'ValidationApiError'
    this.validationErrors = validationErrors
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMITED', 
      retryAfter ? { retryAfter } : undefined)
    this.name = 'RateLimitError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  logger.error('API Error:', error);

  // Handle known API errors
  if (error instanceof ApiError) {
    const response = createErrorResponse(error.message, error.details, error.statusCode)
    return NextResponse.json(response, { status: error.statusCode })
  }

  // Handle validation errors
  if (error instanceof ValidationApiError) {
    const response = createErrorResponse('Validation failed', error.validationErrors, 422)
    return NextResponse.json(response, { status: 422 })
  }

  // Handle Zod validation errors
  if (error instanceof Error && error.name === 'ZodError') {
    const zodError = error as any
    const validationErrors: ValidationError[] = zodError.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.input
    }))
    const response = createErrorResponse('Validation failed', validationErrors, 422)
    return NextResponse.json(response, { status: 422 })
  }

  // Handle Prisma errors
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any
    
    switch (prismaError.code) {
      case 'P2002':
        return NextResponse.json(
          createErrorResponse('Resource already exists', {
            field: prismaError.meta?.target
          }, 409),
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          createErrorResponse('Resource not found', undefined, 404),
          { status: 404 }
        )
      default:
        return NextResponse.json(
          createErrorResponse('Database error', undefined, 500),
          { status: 500 }
        )
    }
  }

  // Handle network errors
  if (error instanceof Error && error.message.includes('fetch')) {
    return NextResponse.json(
      createErrorResponse('Network error', undefined, 500),
      { status: 500 }
    )
  }

  // Handle timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return NextResponse.json(
      createErrorResponse('Request timeout', undefined, 500),
      { status: 500 }
    )
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  return NextResponse.json(
    createErrorResponse(message, undefined, 500),
    { status: 500 }
  )
}

export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function withAuth<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      // Extract request from first argument
      const request = args[0] as NextRequest
      
      // Check for authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid authorization header')
      }

      // TODO: Verify JWT token here
      // const token = authHeader.substring(7)
      // const user = await verifyToken(token)
      // if (!user) {
      //   throw new UnauthorizedError('Invalid token')
      // }

      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function withValidation<T extends any[], R>(
  schema: any,
  handler: (validatedData: any, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const request = args[0] as NextRequest
      const body = await request.json()
      
      // Validate request body
      const result = schema.safeParse(body)
      if (!result.success) {
        const validationErrors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }))
        throw new ValidationApiError(validationErrors)
      }

      return await handler(result.data, ...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return function<T extends any[], R>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      try {
        const request = args[0] as NextRequest
        const clientId = request.ip || 'unknown'
        const now = Date.now()
        
        const clientData = requests.get(clientId)
        
        if (!clientData || now > clientData.resetTime) {
          requests.set(clientId, { count: 1, resetTime: now + windowMs })
        } else if (clientData.count >= maxRequests) {
          const retryAfter = Math.ceil((clientData.resetTime - now) / 1000)
          throw new RateLimitError(retryAfter)
        } else {
          clientData.count++
        }

        return await handler(...args)
      } catch (error) {
        return handleApiError(error)
      }
    }
  }
}

// Utility function to create standardized success responses
export function createSuccessResponseHandler<T>(data: T, message?: string): NextResponse {
  const response = createSuccessResponse(data, message)
  return NextResponse.json(response, { status: 200 })
}

export function createCreatedResponseHandler<T>(data: T, message?: string): NextResponse {
  const response = createSuccessResponse(data, message)
  return NextResponse.json(response, { status: 201 })
}

export function createNoContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}
