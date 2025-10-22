import { z } from 'zod'

// Common validation schemas to reduce duplication across services

// Basic field validations
export const commonString = {
  short: z.string().min(1).max(50),
  medium: z.string().min(1).max(200),
  long: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  email: z.string().email(),
  cuid: z.string().cuid(),
  optionalCuid: z.string().cuid().optional()}

// Common object schemas
export const commonSchemas = {
  id: z.object({
    id: commonString.cuid
  }),
  
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10),
    offset: z.number().int().nonnegative().optional()
  }),
  
  sort: z.object({
    field: commonString.short,
    direction: z.enum(['asc', 'desc']).default('desc')
  }),
  
  search: z.object({
    search: commonString.medium.optional(),
    query: commonString.medium.optional()
  }),
  
  user: z.object({
    id: commonString.cuid,
    username: commonString.short,
    name: commonString.medium,
    email: commonString.email,
    avatar: commonString.url.optional(),
    bio: commonString.description,
    location: commonString.medium.optional(),
    website: commonString.url.optional()
  }),
  
  message: z.object({
    message: commonString.long.optional(),
    content: commonString.long.optional()
  }),
  
  privacy: z.object({
    privacyLevel: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).default('PUBLIC')
  }),
  
  timestamps: z.object({
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
  })
}

// Common validation functions
export const validateCommon = {
  pagination: (data: any) => commonSchemas.pagination.parse(data),
  sort: (data: any) => commonSchemas.sort.parse(data),
  search: (data: any) => commonSchemas.search.parse(data),
  id: (data: any) => commonSchemas.id.parse(data),
  message: (data: any) => commonSchemas.message.parse(data),
  privacy: (data: any) => commonSchemas.privacy.parse(data)
}

// Common error messages
export const commonErrors = {
  notFound: (resource: string) => `${resource} not found`,
  accessDenied: 'Access denied',
  invalidInput: 'Invalid input data',
  validationError: 'Validation error',
  serverError: 'Internal server error',
  unauthorized: 'Unauthorized',
  forbidden: 'Forbidden',
  conflict: 'Resource already exists',
  tooManyRequests: 'Too many requests'
} as const

// Common success messages
export const commonSuccess = {
  created: (resource: string) => `${resource} created successfully`,
  updated: (resource: string) => `${resource} updated successfully`,
  deleted: (resource: string) => `${resource} deleted successfully`,
  retrieved: (resource: string) => `${resource} retrieved successfully`,
  actionCompleted: (action: string) => `${action} completed successfully`
} as const



























