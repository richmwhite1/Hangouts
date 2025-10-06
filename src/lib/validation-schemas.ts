import { z } from 'zod'

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const commonSchemas = {
  // User schemas
  user: {
    id: z.string().cuid(),
    email: z.string().email('Invalid email format'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    bio: z.string().max(500, 'Bio too long').optional(),
    location: z.string().max(200, 'Location too long').optional(),
    website: z.string().url('Invalid website URL').optional(),
    birthDate: z.string().datetime('Invalid birth date').optional(),
  },

  // Authentication schemas
  auth: {
    signUp: z.object({
      email: z.string().email('Invalid email format'),
      username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username too long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
      name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    }),

    signIn: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required')
    }),

    changePassword: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    })
  },

  // Hangout schemas
  hangout: {
    create: z.object({
      title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
      description: z.string().max(1000, 'Description too long').optional(),
      location: z.string().max(200, 'Location too long').optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      startTime: z.string().datetime('Invalid start time'),
      endTime: z.string().datetime('Invalid end time'),
      privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).default('PRIVATE'),
      maxParticipants: z.number().min(2, 'Must allow at least 2 participants').max(100, 'Too many participants').optional(),
      weatherEnabled: z.boolean().default(false),
      image: z.string().url('Invalid image URL').optional(),
      // Poll-specific fields
      isPoll: z.boolean().optional(),
      pollOptions: z.array(z.object({
        title: z.string().min(1, 'Option title is required'),
        description: z.string().max(500, 'Option description too long').optional(),
        date: z.string().datetime('Invalid date').optional(),
        time: z.string().optional(),
        location: z.string().max(200, 'Location too long').optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional()
      })).min(2, 'At least 2 poll options required').max(10, 'Too many poll options').optional()
    }),

    update: z.object({
      title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
      description: z.string().max(1000, 'Description too long').optional(),
      location: z.string().max(200, 'Location too long').optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      startTime: z.string().datetime('Invalid start time').optional(),
      endTime: z.string().datetime('Invalid end time').optional(),
      privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).optional(),
      maxParticipants: z.number().min(2, 'Must allow at least 2 participants').max(100, 'Too many participants').optional(),
      weatherEnabled: z.boolean().optional(),
      image: z.string().url('Invalid image URL').optional()
    }),

    rsvp: z.object({
      status: z.enum(['YES', 'NO', 'MAYBE']),
      message: z.string().max(500, 'Message too long').optional()
    })
  },

  // Friend schemas
  friend: {
    request: z.object({
      receiverId: z.string().cuid('Invalid user ID'),
      message: z.string().max(500, 'Message too long').optional()
    }),

    respond: z.object({
      requestId: z.string().cuid('Invalid request ID'),
      status: z.enum(['ACCEPTED', 'DECLINED'])
    }),

    search: z.object({
      query: z.string().min(2, 'Search query must be at least 2 characters').max(100, 'Search query too long'),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0)
    })
  },

  // Group schemas
  group: {
    create: z.object({
      name: z.string().min(1, 'Group name is required').max(100, 'Group name too long'),
      description: z.string().max(500, 'Description too long').optional(),
      avatar: z.string().url('Invalid avatar URL').optional()
    }),

    update: z.object({
      name: z.string().min(1, 'Group name is required').max(100, 'Group name too long').optional(),
      description: z.string().max(500, 'Description too long').optional(),
      avatar: z.string().url('Invalid avatar URL').optional()
    }),

    invite: z.object({
      userIds: z.array(z.string().cuid('Invalid user ID')).min(1, 'At least one user must be invited').max(50, 'Too many users to invite')
    }),

    updateMember: z.object({
      userId: z.string().cuid('Invalid user ID'),
      role: z.enum(['ADMIN', 'MEMBER'])
    })
  },

  // Poll schemas
  poll: {
    create: z.object({
      title: z.string().min(1, 'Poll title is required').max(200, 'Poll title too long'),
      description: z.string().max(1000, 'Poll description too long').optional(),
      options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required').max(10, 'Too many options'),
      allowMultiple: z.boolean().default(false),
      isAnonymous: z.boolean().default(false),
      expiresAt: z.string().datetime('Invalid expiration date').optional(),
      consensusPercentage: z.number().min(1).max(100).default(70),
      minimumParticipants: z.number().min(1).default(2),
      consensusType: z.enum(['percentage', 'absolute']).default('percentage')
    }),

    vote: z.object({
      option: z.string().min(1, 'Option is required'),
      isPreferred: z.boolean().optional()
    })
  },

  // Notification schemas
  notification: {
    preferences: z.object({
      type: z.enum([
        'FRIEND_REQUEST',
        'FRIEND_ACCEPTED',
        'MESSAGE_RECEIVED',
        'CONTENT_INVITATION',
        'CONTENT_RSVP',
        'CONTENT_REMINDER',
        'CONTENT_UPDATE',
        'COMMUNITY_INVITATION',
        'MENTION',
        'LIKE',
        'COMMENT',
        'SHARE'
      ]),
      emailEnabled: z.boolean(),
      pushEnabled: z.boolean(),
      inAppEnabled: z.boolean()
    }),

    markRead: z.object({
      notificationIds: z.array(z.string().cuid('Invalid notification ID')).min(1, 'At least one notification ID required')
    })
  },

  // Comment schemas
  comment: {
    create: z.object({
      text: z.string().min(1, 'Comment text is required').max(1000, 'Comment too long'),
      replyToId: z.string().cuid('Invalid reply ID').optional()
    }),

    update: z.object({
      text: z.string().min(1, 'Comment text is required').max(1000, 'Comment too long')
    })
  },

  // Upload schemas
  upload: {
    image: z.object({
      type: z.enum(['profile', 'hangout', 'group']),
      hangoutId: z.string().cuid('Invalid hangout ID').optional(),
      groupId: z.string().cuid('Invalid group ID').optional()
    })
  },

  // User preferences schemas
  preferences: {
    update: z.object({
      quickActivities: z.array(z.object({
        name: z.string().min(1, 'Activity name is required').max(50, 'Activity name too long'),
        activity: z.string().min(1, 'Activity is required').max(200, 'Activity too long')
      })).optional(),
      quickLocations: z.array(z.object({
        name: z.string().min(1, 'Location name is required').max(50, 'Location name too long'),
        location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional()
      })).optional(),
      quickTimes: z.array(z.object({
        name: z.string().min(1, 'Time name is required').max(50, 'Time name too long'),
        date: z.string().datetime('Invalid date'),
        time: z.string().min(1, 'Time is required')
      })).optional()
    })
  }
}

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const querySchemas = {
  pagination: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
    offset: z.string().transform(Number).pipe(z.number().min(0)).default('0')
  }),

  search: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
    offset: z.string().transform(Number).pipe(z.number().min(0)).default('0')
  }),

  hangoutFilters: z.object({
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    privacy: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20'),
    offset: z.string().transform(Number).pipe(z.number().min(0)).default('0')
  })
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries())
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    }
    return { success: false, error: 'Invalid query parameters' }
  }
}

export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    }
    return { success: false, error: 'Invalid request body' }
  }
}

// ============================================================================
// COMMON VALIDATION FUNCTIONS
// ============================================================================

export const validators = {
  isCuid: (value: string) => z.string().cuid().safeParse(value).success,
  isEmail: (value: string) => z.string().email().safeParse(value).success,
  isUrl: (value: string) => z.string().url().safeParse(value).success,
  isDateTime: (value: string) => z.string().datetime().safeParse(value).success,
  isEnum: <T extends readonly [string, ...string[]]>(value: string, enumValues: T) => 
    z.enum(enumValues).safeParse(value).success
}
















