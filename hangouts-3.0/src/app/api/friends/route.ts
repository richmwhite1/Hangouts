import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    // In development mode without Clerk keys, use development user
    let user
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')) {
      user = {
        id: 'cmgmmbehc0000jpzattv53v2o',
        email: 'dev@example.com',
        username: 'devuser',
        name: 'Development User'
      }
    } else {
      const { userId: clerkUserId } = await auth()
      if (!clerkUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      user = await getClerkApiUser()
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
      }
    }

    // Get user's friends using the correct schema (userId/friendId)
    const friendships = await db.friendship.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
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
    const friends = friendships.map(friendship => ({
      id: friendship.id,
      friend: friendship.friend,
      status: friendship.status,
      createdAt: friendship.createdAt
    }))

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