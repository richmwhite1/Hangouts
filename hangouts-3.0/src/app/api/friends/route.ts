import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { getHangoutStats } from '@/lib/services/friend-relationship-service'
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

    // Get user's friends using the correct schema (userId/friendId)
    // Query from both directions to ensure we find all friendships
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: user.id },
          { friendId: user.id }
        ],
        status: 'ACTIVE'
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

    // Get hangout stats for each friend (in parallel for performance)
    // Determine which user is the friend (not the current user)
    const friendsWithStats = await Promise.all(
      friendships.map(async (friendship) => {
        try {
          // Determine which user is the friend (the one that's not the current user)
          const friendUser = friendship.userId === user.id ? friendship.friend : friendship.user
          const friendId = friendship.userId === user.id ? friendship.friendId : friendship.userId
          
          const stats = await getHangoutStats(user.id, friendId)
          return {
            id: friendship.id,
            friend: friendUser,
            status: friendship.status,
            createdAt: friendship.createdAt,
            desiredHangoutFrequency: friendship.desiredHangoutFrequency,
            stats: {
              lastHangoutDate: stats.lastHangoutDate,
              totalHangouts: stats.totalHangouts,
              invitedCount: stats.invitedCount,
              wasInvitedCount: stats.wasInvitedCount
            }
          }
        } catch (error) {
          logger.error(`Error getting stats for friendship ${friendship.id}:`, error)
          // Determine which user is the friend (the one that's not the current user)
          const friendUser = friendship.userId === user.id ? friendship.friend : friendship.user
          
          // Return friend without stats if there's an error
          return {
            id: friendship.id,
            friend: friendUser,
            status: friendship.status,
            createdAt: friendship.createdAt,
            desiredHangoutFrequency: friendship.desiredHangoutFrequency,
            stats: {
              lastHangoutDate: null,
              totalHangouts: 0,
              invitedCount: 0,
              wasInvitedCount: 0
            }
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      friends: friendsWithStats
    })
  } catch (error) {
    logger.error('Error fetching friends:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Friends API Error:', errorMessage, errorStack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch friends',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}