import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { sendPushNotification } from '@/lib/push-notifications'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// POST /api/push/test - Send test push notification (development only)
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(createErrorResponse('Not available', 'Test notifications are only available in development'), { status: 403 })
    }

    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const body = await request.json()
    const { message, title } = body

    const testPayload = {
      title: title || 'Test Notification',
      message: message || 'This is a test push notification from Hangouts 3.0!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'test-notification',
      data: {
        type: 'TEST',
        timestamp: new Date().toISOString(),
        userId: user.id
      },
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: false,
      silent: false
    }

    const result = await sendPushNotification(user.id, testPayload)

    if (result.success) {
      logger.info(`Test push notification sent to user ${user.id}`)
      return NextResponse.json(createSuccessResponse(result, 'Test notification sent successfully'))
    } else {
      logger.warn(`Test push notification failed for user ${user.id}: ${result.error}`)
      return NextResponse.json(createErrorResponse('Failed to send test notification', result.error), { status: 500 })
    }

  } catch (error) {
    logger.error('Error sending test push notification:', error)
    return NextResponse.json(createErrorResponse('Failed to send test notification', error.message), { status: 500 })
  }
}
