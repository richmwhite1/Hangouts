import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }
    const now = new Date()
    const result = await db.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
        isDismissed: false
      },
      data: {
        isRead: true,
        readAt: now
      }
    })
    return NextResponse.json(createSuccessResponse({
      updatedCount: result.count
    }, 'All notifications marked as read'))
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    return NextResponse.json(createErrorResponse('Failed to mark all notifications as read', error.message), { status: 500 })
  }
}