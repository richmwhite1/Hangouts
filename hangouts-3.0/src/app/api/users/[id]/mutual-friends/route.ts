import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: targetUserId } = await params

    // Don't show mutual friends for own profile
    if (user.id === targetUserId) {
      return NextResponse.json(createSuccessResponse({ mutualFriends: [], count: 0 }, 'No mutual friends for own profile'))
    }

    // Get current user's friends
    const currentUserFriendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: user.id },
          { friendId: user.id }
        ],
        status: 'ACTIVE'
      }
    })

    const currentUserFriendIds = new Set(
      currentUserFriendships.map(f => 
        f.userId === user.id ? f.friendId : f.userId
      )
    )

    // Get target user's friends
    const targetUserFriendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: targetUserId },
          { friendId: targetUserId }
        ],
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    // Find mutual friends
    const mutualFriends = []
    const mutualFriendIds = new Set<string>()

    for (const friendship of targetUserFriendships) {
      const friendId = friendship.userId === targetUserId 
        ? friendship.friendId 
        : friendship.userId
      
      const friend = friendship.userId === targetUserId 
        ? friendship.friend 
        : friendship.user

      if (currentUserFriendIds.has(friendId) && !mutualFriendIds.has(friendId)) {
        mutualFriends.push({
          id: friend.id,
          name: friend.name,
          username: friend.username,
          avatar: friend.avatar
        })
        mutualFriendIds.add(friendId)
      }
    }

    return NextResponse.json(
      createSuccessResponse(
        { 
          mutualFriends: mutualFriends.slice(0, 10), // Limit to 10 for display
          count: mutualFriends.length 
        },
        'Mutual friends retrieved successfully'
      )
    )
  } catch (error: any) {
    logger.error('Error fetching mutual friends:', error)
    return NextResponse.json(
      createErrorResponse(
        'Failed to fetch mutual friends',
        error?.message || 'Unknown error'
      ),
      { status: 500 }
    )
  }
}

