import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { FriendRequestService } from '@/lib/services/friend-request-service'
import { triggerNotification, getUserDisplayName } from '@/lib/notification-triggers'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { userId, message } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Use FriendRequestService to send request (handles all validation and auto-accept)
    const friendRequest = await FriendRequestService.sendFriendRequest(
      user.id,
      userId,
      message
    )

    // Send notification to the receiver (only if it's a new request, not auto-accepted)
    // The service handles auto-accept scenarios, so we only notify for new requests
    if (friendRequest.status === 'PENDING') {
      try {
        const senderName = await getUserDisplayName(user.id)
        await triggerNotification({
          type: 'FRIEND_REQUEST',
          recipientId: userId,
          title: 'New Friend Request',
          message: `${senderName} sent you a friend request`,
          senderId: user.id,
          data: {
            friendRequestId: friendRequest.id,
            message: message
          }
        })
      } catch (notificationError) {
        logger.error('Error sending friend request notification:', notificationError)
        // Don't fail the request if notification fails
      }
    } else if (friendRequest.status === 'ACCEPTED') {
      // If auto-accepted, send acceptance notification to the original sender
      try {
        const receiverName = await getUserDisplayName(user.id)
        await triggerNotification({
          type: 'FRIEND_ACCEPTED',
          recipientId: userId,
          title: 'Friend Request Accepted',
          message: `${receiverName} accepted your friend request`,
          senderId: user.id,
          data: {
            friendRequestId: friendRequest.id
          }
        })
      } catch (notificationError) {
        logger.error('Error sending friend accepted notification:', notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      request: friendRequest
    })
  } catch (error) {
    logger.error('Error sending friend request:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
