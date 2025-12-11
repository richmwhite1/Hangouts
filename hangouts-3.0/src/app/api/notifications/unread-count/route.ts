import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { NotificationQueries } from '@/lib/db-queries'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'User not found'), { status: 401 })
    }

    const count = await NotificationQueries.getUnreadCount(user.id)

    return NextResponse.json(createSuccessResponse({ count }))
  } catch (error) {
    logger.error('Error fetching unread count', error)
    return NextResponse.json(createErrorResponse('Failed to fetch unread notifications'), { status: 500 })
  }
}










