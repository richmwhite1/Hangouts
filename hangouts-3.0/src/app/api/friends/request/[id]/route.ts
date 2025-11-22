/**
 * DEPRECATED: This route is maintained for backward compatibility.
 * New code should use PUT /api/friends/requests/[id] instead.
 * This route will be removed in a future version.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { FriendRequestService } from '@/lib/services/friend-request-service'
import { triggerNotification, getUserDisplayName } from '@/lib/notification-triggers'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()
    const { id: requestId } = await params

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    let updatedRequest

    // Use FriendRequestService for proper transaction safety and bidirectional friendship creation
    if (status === 'ACCEPTED') {
      const result = await FriendRequestService.acceptFriendRequest(requestId, user.id)
      updatedRequest = result.request

      // Send notification to the sender that their friend request was accepted
      try {
        const receiverName = await getUserDisplayName(user.id)
        await triggerNotification({
          type: 'FRIEND_ACCEPTED',
          recipientId: updatedRequest.sender.id,
          title: 'Friend Request Accepted',
          message: `${receiverName} accepted your friend request`,
          senderId: user.id,
          data: {
            friendRequestId: updatedRequest.id
          }
        })
      } catch (notificationError) {
        logger.error('Error sending friend accepted notification:', notificationError)
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
    logger.error('Error responding to friend request:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to respond to friend request'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
