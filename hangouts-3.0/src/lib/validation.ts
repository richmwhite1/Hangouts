import { z } from 'zod'
import validator from 'validator'
import DOMPurify from 'dompurify'
import { createLogger } from './winston-logger'

const logger = createLogger('VALIDATION')

// Common validation schemas
export const commonSchemas = {
  // User validation
  userId: z.string().uuid('Invalid user ID format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  
  email: z.string().email('Invalid email format'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  // Content validation
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform(val => sanitizeHtml(val)),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .transform(val => sanitizeHtml(val)),
  
  // Location validation
  location: z.string()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters')
    .transform(val => sanitizeHtml(val)),
  
  // Date validation
  dateTime: z.string().datetime('Invalid date format'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // File validation
  fileSize: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'), // 10MB
  imageFile: z.string().refine(
    (val) => /\.(jpg|jpeg|png|gif|webp)$/i.test(val),
    'Only image files are allowed'
  ),
  
  // Pagination
  page: z.number().int().min(1, 'Page must be at least 1'),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be less than 100'),
}

// Specific validation schemas for different entities
export const validationSchemas = {
  // User schemas
  createUser: z.object({
    username: commonSchemas.username,
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: z.string().min(1).max(50).transform(sanitizeHtml),
    lastName: z.string().min(1).max(50).transform(sanitizeHtml),
  }),
  
  updateProfile: z.object({
    firstName: z.string().min(1).max(50).transform(sanitizeHtml).optional(),
    lastName: z.string().min(1).max(50).transform(sanitizeHtml).optional(),
    bio: z.string().max(500).transform(sanitizeHtml).optional(),
    location: commonSchemas.location.optional(),
    website: commonSchemas.url.optional(),
    favoriteActivities: z.array(z.string().max(100).transform(sanitizeHtml)).max(10).optional(),
    favoritePlaces: z.array(z.string().max(100).transform(sanitizeHtml)).max(10).optional(),
  }),
  
  // Hangout schemas
  createHangout: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description,
    location: commonSchemas.location,
    dateTime: commonSchemas.dateTime,
    maxParticipants: z.number().int().min(2).max(50).optional(),
    isPublic: z.boolean().optional(),
    requiresVoting: z.boolean().optional(),
    category: z.string().max(50).transform(sanitizeHtml).optional(),
  }),
  
  updateHangout: z.object({
    title: commonSchemas.title.optional(),
    description: commonSchemas.description.optional(),
    location: commonSchemas.location.optional(),
    dateTime: commonSchemas.dateTime.optional(),
    maxParticipants: z.number().int().min(2).max(50).optional(),
    isPublic: z.boolean().optional(),
    requiresVoting: z.boolean().optional(),
    category: z.string().max(50).transform(sanitizeHtml).optional(),
  }),
  
  // Event schemas
  createEvent: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description,
    venue: commonSchemas.location,
    dateTime: commonSchemas.dateTime,
    price: z.number().min(0).max(10000).optional(),
    category: z.string().max(50).transform(sanitizeHtml).optional(),
    url: commonSchemas.url.optional(),
    imageUrl: commonSchemas.url.optional(),
  }),
  
  // Message schemas
  sendMessage: z.object({
    content: z.string()
      .min(1, 'Message content is required')
      .max(2000, 'Message must be less than 2000 characters')
      .transform(val => sanitizeHtml(val)),
    type: z.enum(['text', 'image', 'file']).optional(),
  }),
  
  // Friend request schemas
  friendRequest: z.object({
    recipientId: commonSchemas.userId,
    message: z.string().max(200).transform(sanitizeHtml).optional(),
  }),
  
  // Poll schemas
  createPoll: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description.optional(),
    options: z.array(z.string().min(1).max(100).transform(sanitizeHtml)).min(2).max(10),
    allowMultipleVotes: z.boolean().optional(),
    expiresAt: commonSchemas.dateTime.optional(),
  }),
  
  // Search schemas
  searchUsers: z.object({
    query: z.string().min(1).max(100).transform(sanitizeHtml),
    page: commonSchemas.page.optional(),
    limit: commonSchemas.limit.optional(),
  }),
  
  // File upload schemas
  uploadImage: z.object({
    file: z.any().refine(
      (file) => file instanceof File,
      'File is required'
    ).refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'File size must be less than 10MB'
    ).refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'Only image files are allowed'
    ),
  }),
}

// Sanitization functions
export function sanitizeHtml(input: string): string {
  if (typeof window !== 'undefined') {
    // Client-side sanitization
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
      ALLOWED_ATTR: [],
    })
  } else {
    // Server-side sanitization (basic)
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
  }
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeHtml(input)
  } else if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  } else if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  return input
}

// Validation middleware
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const result = schema.parse(input)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        logger.warn('Validation failed:', { errors, input })
        return { success: false, errors }
      }
      logger.error('Validation error:', error)
      return { success: false, errors: ['Validation failed'] }
    }
  }
}

// API validation middleware
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return function (handler: (data: T, request: Request) => Promise<Response>) {
    return async function (request: Request): Promise<Response> {
      try {
        const body = await request.json()
        const validation = validateInput(schema)
        
        if (!validation.success) {
          return new Response(
            JSON.stringify({
              error: 'Validation failed',
              details: validation.errors,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        
        return handler(validation.data, request)
      } catch (error) {
        logger.error('Validation middleware error:', error)
        return new Response(
          JSON.stringify({
            error: 'Invalid request body',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }
  }
}

// Security validation functions
export const securityValidation = {
  // SQL injection prevention
  preventSqlInjection: (input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(\bUNION\s+SELECT\b)/i,
      /(\bDROP\s+TABLE\b)/i,
      /(\bINSERT\s+INTO\b)/i,
      /(\bDELETE\s+FROM\b)/i,
      /(\bUPDATE\s+SET\b)/i,
    ]
    
    return !sqlPatterns.some(pattern => pattern.test(input))
  },
  
  // XSS prevention
  preventXss: (input: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ]
    
    return !xssPatterns.some(pattern => pattern.test(input))
  },
  
  // Path traversal prevention
  preventPathTraversal: (input: string): boolean => {
    const pathTraversalPatterns = [
      /\.\./,
      /\.\.\//,
      /\.\.\\/,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /\.\.%252f/gi,
      /\.\.%255c/gi,
    ]
    
    return !pathTraversalPatterns.some(pattern => pattern.test(input))
  },
}

// Comprehensive validation function
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, input: unknown): {
  success: true
  data: T
} | {
  success: false
  errors: string[]
} {
  // First sanitize the input
  const sanitized = sanitizeInput(input)
  
  // Then validate
  const validation = validateInput(schema)
  
  if (!validation.success) {
    return validation
  }
  
  // Additional security checks
  const data = validation.data as any
  if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        if (!securityValidation.preventSqlInjection(value)) {
          return { success: false, errors: [`${key}: Potential SQL injection detected`] }
        }
        if (!securityValidation.preventXss(value)) {
          return { success: false, errors: [`${key}: Potential XSS detected`] }
        }
        if (!securityValidation.preventPathTraversal(value)) {
          return { success: false, errors: [`${key}: Potential path traversal detected`] }
        }
      }
    }
  }
  
  return { success: true, data: validation.data }
}

export default {
  schemas: validationSchemas,
  common: commonSchemas,
  validate: validateInput,
  sanitize: sanitizeInput,
  security: securityValidation,
  middleware: withValidation,
}