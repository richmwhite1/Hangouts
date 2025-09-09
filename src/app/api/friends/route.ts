import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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

    // Get user's friendships
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { user1Id: payload.userId },
          { user2Id: payload.userId }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
          }
        },
        user2: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform friendships to get the friend (not the current user)
    const friends = friendships.map(friendship => {
      const friend = friendship.user1Id === payload.userId ? friendship.user2 : friendship.user1
      return {
        ...friend,
        friendshipId: friendship.id,
        friendsSince: friendship.createdAt,
      }
    })

    return NextResponse.json({ friends })
  } catch (error) {
    console.error('Get friends error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

