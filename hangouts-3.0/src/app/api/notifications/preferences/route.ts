import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// All notification types that need preferences
const NOTIFICATION_TYPES = [
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
  'SHARE',
  'POLL_VOTE_CAST',
  'POLL_CONSENSUS_REACHED',
  'HANGOUT_CONFIRMED',
  'HANGOUT_CANCELLED'
] as const

// Default preferences for each notification type
const DEFAULT_PREFERENCES = {
  FRIEND_REQUEST: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  FRIEND_ACCEPTED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  MESSAGE_RECEIVED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  CONTENT_INVITATION: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  CONTENT_RSVP: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  CONTENT_REMINDER: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  CONTENT_UPDATE: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
  COMMUNITY_INVITATION: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  MENTION: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  LIKE: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
  COMMENT: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  SHARE: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
  POLL_VOTE_CAST: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
  POLL_CONSENSUS_REACHED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  HANGOUT_CONFIRMED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
  HANGOUT_CANCELLED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true }
} as const

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const clerkUser = await getClerkApiUser()
    if (!clerkUser) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'User not found'), { status: 401 })
    }

    const userId = clerkUser.id

    // Get all existing preferences for this user
    const existingPreferences = await db.notificationPreference.findMany({
      where: { userId: userId }
    })

    // Create a map of existing preferences by type
    const preferencesMap = new Map(
      existingPreferences.map(pref => [pref.type, pref])
    )

    // Build response with all notification types, using existing preferences or defaults
    const allPreferences = NOTIFICATION_TYPES.map(type => {
      const existing = preferencesMap.get(type)
      if (existing) {
        return {
          type,
          emailEnabled: existing.emailEnabled,
          pushEnabled: existing.pushEnabled,
          inAppEnabled: existing.inAppEnabled
        }
      } else {
        // Return default preferences (don't create in DB yet)
        return {
          type,
          ...DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES]
        }
      }
    })

    return NextResponse.json(createSuccessResponse(allPreferences, 'Notification preferences retrieved successfully'))

  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch notification preferences', error.message), { status: 500 })
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const clerkUser = await getClerkApiUser()
    if (!clerkUser) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'User not found'), { status: 401 })
    }

    const userId = clerkUser.id
    const body = await request.json()

    // Handle bulk update of all preferences
    if (body.preferences && Array.isArray(body.preferences)) {
      const results = []
      
      for (const pref of body.preferences) {
        const { type, emailEnabled, pushEnabled, inAppEnabled } = pref
        
        if (!NOTIFICATION_TYPES.includes(type)) {
          continue // Skip invalid types
        }

        const result = await db.notificationPreference.upsert({
          where: { 
            userId_type: { 
              userId: userId, 
              type: type as any 
            } 
          },
          update: {
            emailEnabled: emailEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].emailEnabled,
            pushEnabled: pushEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].pushEnabled,
            inAppEnabled: inAppEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].inAppEnabled
          },
          create: {
            userId: userId,
            type: type as any,
            emailEnabled: emailEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].emailEnabled,
            pushEnabled: pushEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].pushEnabled,
            inAppEnabled: inAppEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].inAppEnabled
          }
        })
        
        results.push(result)
      }

      return NextResponse.json(createSuccessResponse(results, 'All notification preferences updated successfully'))
    }

    // Handle single preference update (backward compatibility)
    const { type, emailEnabled, pushEnabled, inAppEnabled } = body

    if (!type || !NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json(createErrorResponse('Invalid notification type', 'Type must be one of the valid notification types'), { status: 400 })
    }

    const preferences = await db.notificationPreference.upsert({
      where: { 
        userId_type: { 
          userId: userId, 
          type: type as any 
        } 
      },
      update: {
        emailEnabled: emailEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].emailEnabled,
        pushEnabled: pushEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].pushEnabled,
        inAppEnabled: inAppEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].inAppEnabled
      },
      create: {
        userId: userId,
        type: type as any,
        emailEnabled: emailEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].emailEnabled,
        pushEnabled: pushEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].pushEnabled,
        inAppEnabled: inAppEnabled ?? DEFAULT_PREFERENCES[type as keyof typeof DEFAULT_PREFERENCES].inAppEnabled
      }
    })

    return NextResponse.json(createSuccessResponse(preferences, 'Notification preferences updated successfully'))

  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return NextResponse.json(createErrorResponse('Failed to update notification preferences', error.message), { status: 500 })
  }
}