import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { createFriendRequestNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
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

    // Get sent and received friend requests
    const [sentRequests, receivedRequests] = await Promise.all([
      db.friendRequest.findMany({
        where: { senderId: payload.userId },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.friendRequest.findMany({
        where: { receiverId: payload.userId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    return NextResponse.json({
      sent: sentRequests,
      received: receivedRequests,
    })
  } catch (error) {
    console.error('Get friend requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { receiverId, message } = body

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      )
    }

    if (receiverId === payload.userId) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      )
    }

    // Check if receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if friendship already exists
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { user1Id: payload.userId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: payload.userId }
        ]
      }
    })

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Already friends with this user' },
        { status: 400 }
      )
    }

    // Check if friend request already exists
    const existingRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: payload.userId, receiverId },
          { senderId: receiverId, receiverId: payload.userId }
        ]
      }
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Friend request already exists' },
        { status: 400 }
      )
    }

    // Get sender info for notification
    const sender = await db.user.findUnique({
      where: { id: payload.userId },
      select: { name: true }
    })

    // Create friend request
    const friendRequest = await db.friendRequest.create({
      data: {
        senderId: payload.userId,
        receiverId,
        message: message || null,
      },
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

    // Create notification for the receiver
    if (sender) {
      await createFriendRequestNotification(payload.userId, receiverId, sender.name)
    }

    return NextResponse.json(friendRequest)
  } catch (error) {
    console.error('Create friend request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
