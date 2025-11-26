import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

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

    // Get user's friends using bidirectional query (userId/friendId can be in either direction)
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: user.id, status: 'ACTIVE' },
          { friendId: user.id, status: 'ACTIVE' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        }
      }
    })

    // Transform friendships to match expected format
    const friends = friendships.map(friendship => {
      // Determine which user is the friend (not the current user)
      const friendUser = friendship.userId === user.id ? friendship.friend : friendship.user
      
      return {
        id: friendship.id,
        friend: friendUser,
        status: friendship.status,
        createdAt: friendship.createdAt
      }
    })

    return NextResponse.json({
      success: true,
      friends: friends
    })
  } catch (error) {
    logger.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    )
  }
}