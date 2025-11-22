import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { FriendRequestService } from '@/lib/services/friend-request-service'
import { createFriendAcceptedNotification } from '@/lib/notifications'
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED or DECLINED' },
        { status: 400 }
      )
    }

    let updatedRequest

    // Use FriendRequestService for proper transaction safety and bidirectional friendship creation
    if (status === 'ACCEPTED') {
      const result = await FriendRequestService.acceptFriendRequest(requestId, user.id)
      updatedRequest = result.request

      // Create notification for the sender
      try {
        await createFriendAcceptedNotification(
          updatedRequest.sender.id,
          updatedRequest.receiver.id,
          updatedRequest.receiver.name
        )

        // Mark the original friend request notification as read for the receiver
        await db.$executeRaw`
          UPDATE "Notification" 
          SET "isRead" = true, "readAt" = NOW()
          WHERE "userId" = ${updatedRequest.receiver.id} 
          AND "type" = 'FRIEND_REQUEST'
          AND "data"->>'senderId' = ${updatedRequest.sender.id}
        `
      } catch (notificationError) {
        logger.error('Error handling notifications after acceptance:', notificationError)
        // Don't fail the request if notification fails
      }
    } else {
      // DECLINED
      updatedRequest = await FriendRequestService.declineFriendRequest(requestId, user.id)
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })
  } catch (error) {
    logger.error('Update friend request error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Use FriendRequestService to cancel (updates status to CANCELLED, doesn't delete)
    const cancelledRequest = await FriendRequestService.cancelFriendRequest(requestId, user.id)

    return NextResponse.json({
      success: true,
      request: cancelledRequest
    })
  } catch (error) {
    logger.error('Cancel friend request error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
