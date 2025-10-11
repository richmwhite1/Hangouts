import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { createFriendAcceptedNotification } from '@/lib/notifications'

import { logger } from '@/lib/logger'
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = body

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED or DECLINED' },
        { status: 400 }
      )
    }

    // Find the friend request
    const friendRequest = await db.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true}
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true}
        }
      }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }

    // Check if user is the receiver
    if (friendRequest.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if request is still pending
    if (friendRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Friend request already processed' },
        { status: 400 }
      )
    }

    // Update the friend request status
    const updatedRequest = await db.friendRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true}
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true}
        }
      }
    })

    // If accepted, create friendship and notification
    if (status === 'ACCEPTED') {
      await db.friendship.create({
        data: {
          user1Id: friendRequest.senderId,
          user2Id: friendRequest.receiverId}
      })

      // Create notification for the sender
      await createFriendAcceptedNotification(
        friendRequest.senderId, 
        friendRequest.receiverId, 
        friendRequest.receiver.name
      )

      // Mark the original friend request notification as read for the receiver
      // Use raw SQL to update the notification since Prisma JSON queries can be tricky
      await db.$executeRaw`
        UPDATE "Notification" 
        SET "isRead" = true, "readAt" = NOW()
        WHERE "userId" = ${friendRequest.receiverId} 
        AND "type" = 'FRIEND_REQUEST'
        AND "data"->>'senderId' = ${friendRequest.senderId}
      `
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    logger.error('Update friend request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Find the friend request
    const friendRequest = await db.friendRequest.findUnique({
      where: { id: requestId }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }

    // Check if user is the sender (can cancel) or receiver (can decline)
    if (friendRequest.senderId !== user.id && friendRequest.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the friend request
    await db.friendRequest.delete({
      where: { id: requestId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Delete friend request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
