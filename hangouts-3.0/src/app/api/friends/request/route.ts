import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
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

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
    }

    // Check if user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if friend request already exists (including non-pending ones)
    const existingRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: userId },
          { senderId: userId, receiverId: user.id }
        ]
      }
    })

    if (existingRequest) {
      // If request is pending, return appropriate message
      if (existingRequest.status === 'PENDING') {
        if (existingRequest.senderId === user.id) {
          return NextResponse.json({ 
            error: 'You have already sent a friend request to this user',
            requestId: existingRequest.id 
          }, { status: 400 })
        } else {
          return NextResponse.json({ 
            error: 'This user has already sent you a friend request',
            requestId: existingRequest.id 
          }, { status: 400 })
        }
      }
      // If request was accepted, they're already friends
      if (existingRequest.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 })
      }
      // If declined, allow new request
    }

    // Check if already friends
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: userId },
          { userId: userId, friendId: user.id }
        ],
        status: 'ACTIVE'
      }
    })

    if (existingFriendship) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 })
    }

    // Create friend request
    const friendRequest = await db.friendRequest.create({
      data: {
        senderId: user.id,
        receiverId: userId,
        message: message || null
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // Send notification to the receiver
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

    return NextResponse.json({
      success: true,
      request: friendRequest
    })
  } catch (error) {
    logger.error('Error sending friend request:', error);
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    )
  }
}
