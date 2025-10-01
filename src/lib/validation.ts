/**
 * Standardized Validation Utilities
 * Provides consistent validation across all API endpoints
 */

import { z } from 'zod'
import { ValidationError } from './api-error-handler'

// Common validation schemas
export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  date: z.string().datetime('Invalid date format'),
  url: z.string().url('Invalid URL format').optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  pagination: z.object({
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').default(20)
  })
}

// Hangout validation schemas
export const hangoutSchemas = {
  create: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description,
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    startTime: commonSchemas.date,
    endTime: commonSchemas.date,
    maxParticipants: z.number().int().min(1).max(1000).optional(),
    weatherEnabled: z.boolean().default(false),
    isPoll: z.boolean().default(false),
    privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).default('PRIVATE')
  }),
  
  update: z.object({
    title: commonSchemas.title.optional(),
    description: commonSchemas.description,
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    startTime: commonSchemas.date.optional(),
    endTime: commonSchemas.date.optional(),
    maxParticipants: z.number().int().min(1).max(1000).optional(),
    weatherEnabled: z.boolean().optional(),
    isPoll: z.boolean().optional(),
    privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).optional()
  }),
  
  rsvp: z.object({
    status: z.enum(['YES', 'NO', 'MAYBE', 'PENDING'])
  }),
  
  poll: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description,
    options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required'),
    allowMultiple: z.boolean().default(false),
    isAnonymous: z.boolean().default(false),
    expiresAt: commonSchemas.date.optional(),
    consensusPercentage: z.number().int().min(1).max(100).default(70),
    minimumParticipants: z.number().int().min(1).default(2)
  }),
  
  pollVote: z.object({
    option: z.string().min(1, 'Option is required'),
    ranking: z.number().int().min(1).optional(),
    score: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(500, 'Comment must be less than 500 characters').optional()
  })
}

// User validation schemas
export const userSchemas = {
  signUp: z.object({
    email: commonSchemas.email,
    username: commonSchemas.username,
    name: commonSchemas.name,
    password: commonSchemas.password
  }),
  
  signIn: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required')
  }),
  
  update: z.object({
    name: commonSchemas.name.optional(),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    location: z.string().max(100, 'Location must be less than 100 characters').optional(),
    website: commonSchemas.url,
    birthDate: commonSchemas.date.optional()
  }).partial()
}

// Friend validation schemas
export const friendSchemas = {
  sendRequest: z.object({
    receiverId: commonSchemas.id,
    message: z.string().max(200, 'Message must be less than 200 characters').optional()
  }),
  
  respondToRequest: z.object({
    status: z.enum(['ACCEPTED', 'DECLINED'])
  })
}

// Validation utility functions
export class ValidationUtils {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: ValidationError[] } {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = (error.errors || []).map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }))
        return { success: false, errors }
      }
      throw error
    }
  }

  static validateQuery<T>(schema: z.ZodSchema<T>, query: Record<string, unknown>): { success: true; data: T } | { success: false; errors: ValidationError[] } {
    // Convert string values to appropriate types for query parameters
    const processedQuery: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // Try to convert to number if it looks like a number
        if (!isNaN(Number(value)) && value.trim() !== '') {
          processedQuery[key] = Number(value)
        } else if (value.toLowerCase() === 'true') {
          processedQuery[key] = true
        } else if (value.toLowerCase() === 'false') {
          processedQuery[key] = false
        } else {
          processedQuery[key] = value
        }
      } else {
        processedQuery[key] = value
      }
    }

    return this.validate(schema, processedQuery)
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ')
  }

  static sanitizeHtml(input: string): string {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  static validateDate(dateString: string): boolean {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  static validatePagination(page: number, limit: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!Number.isInteger(page) || page < 1) {
      errors.push('Page must be a positive integer')
    }
    
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be an integer between 1 and 100')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Middleware for API route validation
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: Request) => {
    const body = req.body ? JSON.parse(req.body as string) : {}
    const result = ValidationUtils.validate(schema, body)
    
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors.map(e => e.message).join(', ')}`)
    }
    
    return result.data
  }
}

// Type exports for use in API routes
export type CreateHangoutData = z.infer<typeof hangoutSchemas.create>
export type UpdateHangoutData = z.infer<typeof hangoutSchemas.update>
export type RSVPData = z.infer<typeof hangoutSchemas.rsvp>
export type PollData = z.infer<typeof hangoutSchemas.poll>
export type PollVoteData = z.infer<typeof hangoutSchemas.pollVote>
export type SignUpData = z.infer<typeof userSchemas.signUp>
export type SignInData = z.infer<typeof userSchemas.signIn>
export type UpdateUserData = z.infer<typeof userSchemas.update>
export type SendFriendRequestData = z.infer<typeof friendSchemas.sendRequest>
export type RespondToFriendRequestData = z.infer<typeof friendSchemas.respondToRequest>
export type PaginationData = z.infer<typeof commonSchemas.pagination>
