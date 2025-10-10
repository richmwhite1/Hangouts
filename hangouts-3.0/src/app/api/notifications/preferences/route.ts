import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

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

    let preferences = await db.notificationPreference.findFirst({
      where: { userId: userId }
    })

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await db.notificationPreference.create({
        data: {
          userId: userId,
          type: 'MESSAGE_RECEIVED',
          emailEnabled: true,
          pushEnabled: false,
          inAppEnabled: true
        }
      })
    }

    return NextResponse.json(createSuccessResponse(preferences, 'Notification preferences retrieved successfully'))

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
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
    const {
      type,
      emailEnabled,
      pushEnabled,
      inAppEnabled
    } = body

    // Upsert preferences
    const preferences = await db.notificationPreference.upsert({
      where: { userId: userId },
      update: {
        type: type ?? 'MESSAGE_RECEIVED',
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? false,
        inAppEnabled: inAppEnabled ?? true
      },
      create: {
        userId: userId,
        type: type ?? 'MESSAGE_RECEIVED',
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? false,
        inAppEnabled: inAppEnabled ?? true
      }
    })

    return NextResponse.json(createSuccessResponse(preferences, 'Notification preferences updated successfully'))

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(createErrorResponse('Failed to update notification preferences', error.message), { status: 500 })
  }
}