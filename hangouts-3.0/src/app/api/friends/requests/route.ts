import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { FriendRequestService } from '@/lib/services/friend-request-service'
import { FriendRequestStatus } from '@prisma/client'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get optional status filter from query params
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    let status: FriendRequestStatus | FriendRequestStatus[] | undefined = undefined

    if (statusParam) {
      if (statusParam === 'all') {
        status = undefined // Get all statuses
      } else {
        // Validate status is a valid enum value
        const validStatuses: FriendRequestStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED', 'CANCELLED']
        if (validStatuses.includes(statusParam as FriendRequestStatus)) {
          status = statusParam as FriendRequestStatus
        }
      }
    } else {
      // Default: only return PENDING requests
      status = 'PENDING'
    }

    // Get sent requests
    const sentRequests = await FriendRequestService.getFriendRequests(user.id, {
      type: 'sent',
      status,
      includeDetails: true
    })

    // Get received requests
    const receivedRequests = await FriendRequestService.getFriendRequests(user.id, {
      type: 'received',
      status,
      includeDetails: true
    })

    return NextResponse.json({
      success: true,
      sent: sentRequests,
      received: receivedRequests
    })
  } catch (error) {
    logger.error('Error fetching friend requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friend requests' },
      { status: 500 }
    )
  }
}