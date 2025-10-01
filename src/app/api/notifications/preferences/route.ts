import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    let preferences = await db.notificationPreference.findFirst({
      where: { userId: payload.userId }
    })

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await db.notificationPreference.create({
        data: {
          userId: payload.userId,
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const body = await request.json()
    const {
      type,
      emailEnabled,
      pushEnabled,
      inAppEnabled
    } = body

    // Upsert preferences
    const preferences = await db.notificationPreference.upsert({
      where: { userId: payload.userId },
      update: {
        type: type ?? 'MESSAGE_RECEIVED',
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? false,
        inAppEnabled: inAppEnabled ?? true
      },
      create: {
        userId: payload.userId,
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