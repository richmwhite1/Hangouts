/**
 * Centralized Error Handling & Monitoring
 * 
 * Provides consistent error handling, logging, and monitoring
 * across the entire application.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_FIELDS = 'MISSING_FIELDS',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Business logic errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  CONSENSUS_NOT_REACHED = 'CONSENSUS_NOT_REACHED',
  VOTING_CLOSED = 'VOTING_CLOSED'
}

export interface AppError {
  code: ErrorCode
  message: string
  details?: any
  statusCode: number
  timestamp: string
  requestId?: string
  userId?: string
  stack?: string
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: any
  public readonly timestamp: string
  public readonly requestId?: string
  public readonly userId?: string

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    requestId?: string,
    userId?: string
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
    this.requestId = requestId
    this.userId = userId
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      stack: this.stack
    }
  }
}

/**
 * Error response factory
 */
export function createErrorResponse(
  error: AppError | Error | string,
  requestId?: string
): NextResponse {
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    appError = new AppError(
      ErrorCode.INTERNAL_ERROR,
      error.message,
      500,
      { originalError: error.message },
      requestId
    )
  } else {
    appError = new AppError(
      ErrorCode.INTERNAL_ERROR,
      error,
      500,
      undefined,
      requestId
    )
  }

  // Log error for monitoring
  logger.error('API Error', {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    details: appError.details,
    requestId: appError.requestId,
    userId: appError.userId,
    stack: appError.stack
  })

  return NextResponse.json(
    {
      success: false,
      error: appError.code,
      message: appError.message,
      details: appError.details,
      timestamp: appError.timestamp,
      requestId: appError.requestId
    },
    { status: appError.statusCode }
  )
}

/**
 * Success response factory
 */
export function createSuccessResponse(
  data: any,
  message: string = 'Success',
  requestId?: string
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId
  })
}

/**
 * Error handling middleware
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Re-throw AppError instances
      if (error instanceof AppError) {
        throw error
      }

      // Convert other errors to AppError
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        500,
        { originalError: error }
      )
    }
  }
}

/**
 * Common error constructors
 */
export const errors = {
  unauthorized: (message: string = 'Authentication required') =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),
  
  notFound: (resource: string = 'Resource') =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),
  
  validationError: (message: string, details?: any) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),
  
  permissionDenied: (message: string = 'Permission denied') =>
    new AppError(ErrorCode.PERMISSION_DENIED, message, 403),
  
  rateLimitExceeded: (retryAfter?: number) =>
    new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      429,
      { retryAfter }
    ),
  
  databaseError: (message: string, details?: any) =>
    new AppError(ErrorCode.DATABASE_ERROR, message, 500, details),
  
  votingClosed: () =>
    new AppError(ErrorCode.VOTING_CLOSED, 'Voting is closed', 400),
  
  consensusNotReached: () =>
    new AppError(ErrorCode.CONSENSUS_NOT_REACHED, 'Consensus not reached', 400)
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static startTimer(label: string): () => void {
    const start = Date.now()
    
    return () => {
      const duration = Date.now() - start
      this.recordMetric(label, duration)
    }
  }

  static recordMetric(label: string, value: number) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    
    const values = this.metrics.get(label)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  static getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, any> = {}
    
    for (const [label, values] of this.metrics) {
      if (values.length === 0) continue
      
      result[label] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      }
    }
    
    return result
  }

  static clearMetrics() {
    this.metrics.clear()
  }
}

/**
 * Health check endpoint data
 */
export function getHealthCheckData() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: PerformanceMonitor.getMetrics()
  }
}
