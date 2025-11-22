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

    logger.info('Fetching friends for user', { clerkUserId })

    const user = await getClerkApiUser()
    if (!user) {
      logger.warn('User not found in database', { clerkUserId })
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    logger.info('Found user in database', { userId: user.id, username: user.username })

    // Get user's friends using the correct schema (userId/friendId)
    // Query from both directions to ensure we find all friendships
    let friendships
    try {
      friendships = await db.friendship.findMany({
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
      logger.info('Found friendships', { count: friendships.length, userId: user.id })
    } catch (dbError) {
      logger.error('Database error fetching friendships:', dbError)
      throw dbError
    }

    // If no friendships, return empty array
    if (!friendships || friendships.length === 0) {
      logger.info('No friendships found for user', { userId: user.id })
      return NextResponse.json({
        success: true,
        friends: []
      })
    }

    // Get hangout stats for each friend (in parallel for performance)
    // Determine which user is the friend (not the current user)
    const friendsWithStats = await Promise.all(
      friendships.map(async (friendship) => {
        try {
          // Determine which user is the friend (the one that's not the current user)
          const friendUser = friendship.userId === user.id ? friendship.friend : friendship.user
          const friendId = friendship.userId === user.id ? friendship.friendId : friendship.userId
          
          // Skip if friend user is missing (data integrity issue)
          if (!friendUser || !friendId) {
            logger.warn(`Skipping friendship ${friendship.id} - missing friend data`, {
              userId: friendship.userId,
              friendId: friendship.friendId,
              hasUser: !!friendship.user,
              hasFriend: !!friendship.friend
            })
            return null
          }
          
          let stats
          try {
            stats = await getHangoutStats(user.id, friendId)
          } catch (statsError) {
            logger.error(`Error getting stats for friendship ${friendship.id}:`, statsError)
            stats = {
              lastHangoutDate: null,
              totalHangouts: 0,
              invitedCount: 0,
              wasInvitedCount: 0
            }
          }
          
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
          logger.error(`Error processing friendship ${friendship.id}:`, error)
          // Determine which user is the friend (the one that's not the current user)
          const friendUser = friendship.userId === user.id ? friendship.friend : friendship.user
          
          // Skip if friend user is missing
          if (!friendUser) {
            return null
          }
          
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

    // Filter out null entries (friendships with missing data)
    const validFriends = friendsWithStats.filter((f): f is NonNullable<typeof f> => f !== null)

    return NextResponse.json({
      success: true,
      friends: validFriends
    })
  } catch (error) {
    logger.error('Error fetching friends:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'Error'
    console.error('Friends API Error:', {
      name: errorName,
      message: errorMessage,
      stack: errorStack
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch friends',
        message: errorMessage,
        name: errorName,
        // Include stack in production for debugging (can remove later)
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}