import { z } from 'zod'
import { 
  FriendRequestStatus, 
  ContentStatus, 
  PrivacyLevel, 
  ParticipantRole, 
  RSVPStatus, 
  NotificationType, 
  MessageType, 
  ContentType
} from '@/types/database'

// Authentication schemas
export const signUpSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const signInSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required'),
})

// Content schemas (for hangouts, events, communities)
export const createContentSchema = z.object({
  type: z.enum(['HANGOUT', 'EVENT', 'COMMUNITY']),
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional(),
  latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
  longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
  startTime: z.string()
    .datetime('Invalid start time format')
    .optional(),
  endTime: z.string()
    .datetime('Invalid end time format')
    .optional(),
  privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED']).default('DRAFT'),
  // Hangout-specific fields
  maxParticipants: z.number()
    .int('Must be a whole number')
    .min(2, 'Must allow at least 2 participants')
    .max(100, 'Cannot exceed 100 participants')
    .optional(),
  weatherEnabled: z.boolean().default(false),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime)
  }
  return true
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

export const updateContentSchema = createContentSchema.partial().extend({
  id: z.string().min(1, 'Content ID is required'),
})

// Friend request schemas
export const sendFriendRequestSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  message: z.string()
    .max(200, 'Message must be less than 200 characters')
    .optional(),
})

export const updateFriendRequestSchema = z.object({
  id: z.string().min(1, 'Request ID is required'),
  status: z.enum(['ACCEPTED', 'DECLINED']),
})

// RSVP schemas
export const rsvpSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  status: z.enum(['YES', 'NO', 'MAYBE']),
})

// Poll schemas
export const createPollSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .max(300, 'Description must be less than 300 characters')
    .optional(),
  options: z.array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'Must have at least 2 options')
    .max(10, 'Cannot have more than 10 options'),
  expiresAt: z.string().datetime('Invalid expiration time format').optional(),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
})

export const voteSchema = z.object({
  pollId: z.string().min(1, 'Poll ID is required'),
  option: z.string().min(1, 'Option is required'),
  ranking: z.number()
    .int('Ranking must be a whole number')
    .min(1, 'Ranking must be at least 1')
    .optional(),
})

// Search schemas
export const searchContentSchema = z.object({
  query: z.string().max(100, 'Query must be less than 100 characters').optional(),
  type: z.enum(['HANGOUT', 'EVENT', 'COMMUNITY']).optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional(),
  dateFrom: z.string().datetime('Invalid date format').optional(),
  dateTo: z.string().datetime('Invalid date format').optional(),
  privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED']).optional(),
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
})

// Notification schemas
export const updateNotificationSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
  isRead: z.boolean(),
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
})

// Export inferred types
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CreateContentInput = z.infer<typeof createContentSchema>
export type UpdateContentInput = z.infer<typeof updateContentSchema>
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>
export type UpdateFriendRequestInput = z.infer<typeof updateFriendRequestSchema>
export type RSVPInput = z.infer<typeof rsvpSchema>
export type CreatePollInput = z.infer<typeof createPollSchema>
export type VoteInput = z.infer<typeof voteSchema>
export type SearchContentInput = z.infer<typeof searchContentSchema>
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>
export type PaginationInput = z.infer<typeof paginationSchema>

