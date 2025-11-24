import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { getHangoutStats } from '@/lib/services/friend-relationship-service'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    
    // Get the user ID from params
    const { id: targetUserId } = await params

    // Get user's friends using the correct schema (userId/friendId)
    // Query from both directions to ensure we find all friendships
    let friendships
    try {
      friendships = await db.friendship.findMany({
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
      logger.info('Found friendships for user', { count: friendships.length, targetUserId })
    } catch (dbError) {
      logger.error('Database error fetching friendships:', dbError)
      throw dbError
    }

    // If no friendships, return empty array
    if (!friendships || friendships.length === 0) {
      logger.info('No friendships found for user', { targetUserId })
      return NextResponse.json({
        success: true,
        friends: []
      })
    }

    // Get current user ID if authenticated (for stats calculation)
    let currentUserId: string | null = null
    if (clerkUserId) {
      try {
        const currentUser = await getClerkApiUser()
        if (currentUser) {
          currentUserId = currentUser.id
        }
      } catch (err) {
        // Not authenticated or user not found - that's okay for read-only view
        logger.warn('Could not get current user for stats', { err })
      }
    }

    // Get hangout stats for each friend
    // Determine which user is the friend (not the target user)
    const friendsWithStats = await Promise.all(
      friendships.map(async (friendship) => {
        try {
          // Determine which user is the friend (the one that's not the target user)
          const friendUser = friendship.userId === targetUserId ? friendship.friend : friendship.user
          const friendId = friendship.userId === targetUserId ? friendship.friendId : friendship.userId
          
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
          
          // Get stats if we have a current user (for relationship stats)
          // Otherwise, just return basic info
          let stats
          if (currentUserId) {
            try {
              // Get stats between target user and this friend
              stats = await getHangoutStats(targetUserId, friendId)
            } catch (statsError) {
              logger.error(`Error getting stats for friendship ${friendship.id}:`, statsError)
              stats = {
                lastHangoutDate: null,
                totalHangouts: 0,
                invitedCount: 0,
                wasInvitedCount: 0
              }
            }
          } else {
            // No current user, return empty stats
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
          // Determine which user is the friend (the one that's not the target user)
          const friendUser = friendship.userId === targetUserId ? friendship.friend : friendship.user
          
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
    logger.error('Error fetching user friends:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user friends',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}



