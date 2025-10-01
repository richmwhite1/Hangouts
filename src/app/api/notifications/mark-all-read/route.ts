import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const now = new Date()
    
    const result = await db.notification.updateMany({
      where: {
        userId: payload.userId,
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
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(createErrorResponse('Failed to mark all notifications as read', error.message), { status: 500 })
  }
}
