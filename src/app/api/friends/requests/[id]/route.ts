import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { createFriendAcceptedNotification } from '@/lib/notifications'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      where: { id: params.id },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          }
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
    if (friendRequest.receiverId !== payload.userId) {
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
      where: { id: params.id },
      data: { status },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          }
        }
      }
    })

    // If accepted, create friendship and notification
    if (status === 'ACCEPTED') {
      await db.friendship.create({
        data: {
          user1Id: friendRequest.senderId,
          user2Id: friendRequest.receiverId,
        }
      })

      // Create notification for the sender
      await createFriendAcceptedNotification(
        friendRequest.senderId, 
        friendRequest.receiverId, 
        friendRequest.receiver.name
      )
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Update friend request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      where: { id: params.id }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }

    // Check if user is the sender (can cancel) or receiver (can decline)
    if (friendRequest.senderId !== payload.userId && friendRequest.receiverId !== payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the friend request
    await db.friendRequest.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete friend request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
