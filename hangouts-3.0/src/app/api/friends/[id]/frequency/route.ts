import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * PUT /api/friends/[id]/frequency
 * Update the desired hangout frequency for a friendship
 */
export async function PUT(
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

    const { id: friendId } = await params
    const body = await request.json()
    const { frequency } = body

    logger.info('Updating hangout frequency', { 
      userId: user.id, 
      friendId, 
      frequency,
      body 
    })

    // Validate frequency value
    const validFrequencies = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUALLY', 'SOMETIMES', null]
    if (frequency !== null && !validFrequencies.includes(frequency)) {
      logger.warn('Invalid frequency value', { frequency, validFrequencies })
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      )
    }

    // Find the friendship where current user is userId (preferred)
    let friendship = await db.friendship.findFirst({
      where: {
        userId: user.id,
        friendId: friendId,
        status: 'ACTIVE'
      }
    })

    // If not found, try the reverse direction (bidirectional friendships)
    if (!friendship) {
      friendship = await db.friendship.findFirst({
        where: {
          userId: friendId,
          friendId: user.id,
          status: 'ACTIVE'
        }
      })
    }

    if (!friendship) {
      logger.warn('Friendship not found', { userId: user.id, friendId })
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
    }

    // Update the frequency
    // Note: We update whichever friendship record we found
    // In a bidirectional system, both records should ideally be kept in sync
    try {
      const updatedFriendship = await db.friendship.update({
        where: { id: friendship.id },
        data: {
          desiredHangoutFrequency: frequency
        },
        include: {
          friend: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        }
      })

      // If we updated the reverse friendship, also update the forward one if it exists
      if (friendship.userId === friendId && friendship.friendId === user.id) {
        const forwardFriendship = await db.friendship.findFirst({
          where: {
            userId: user.id,
            friendId: friendId,
            status: 'ACTIVE'
          }
        })
        
        if (forwardFriendship) {
          await db.friendship.update({
            where: { id: forwardFriendship.id },
            data: {
              desiredHangoutFrequency: frequency
            }
          })
          logger.info('Updated both bidirectional friendship records', { 
            userId: user.id, 
            friendId,
            frequency 
          })
        }
      }

      logger.info('Updated hangout frequency', {
        friendshipId: friendship.id,
        userId: user.id,
        friendId,
        frequency
      })

      return NextResponse.json({
        success: true,
        friendship: updatedFriendship
      })
    } catch (updateError) {
      // If include fails, try without include
      logger.warn('Update with include failed, trying without include', { 
        error: updateError instanceof Error ? updateError.message : String(updateError) 
      })
      
      const updatedFriendship = await db.friendship.update({
        where: { id: friendship.id },
        data: {
          desiredHangoutFrequency: frequency
        }
      })

      // If we updated the reverse friendship, also update the forward one if it exists
      if (friendship.userId === friendId && friendship.friendId === user.id) {
        const forwardFriendship = await db.friendship.findFirst({
          where: {
            userId: user.id,
            friendId: friendId,
            status: 'ACTIVE'
          }
        })
        
        if (forwardFriendship) {
          await db.friendship.update({
            where: { id: forwardFriendship.id },
            data: {
              desiredHangoutFrequency: frequency
            }
          })
        }
      }

      logger.info('Updated hangout frequency (without include)', {
        friendshipId: friendship.id,
        userId: user.id,
        friendId,
        frequency
      })

      return NextResponse.json({
        success: true,
        friendship: {
          id: updatedFriendship.id,
          desiredHangoutFrequency: updatedFriendship.desiredHangoutFrequency
        }
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Safely get params for logging
    let friendIdForLog = 'unknown'
    try {
      const paramsResolved = await params
      friendIdForLog = paramsResolved.id
    } catch {
      // Ignore
    }
    
    logger.error('Error updating hangout frequency:', {
      error: errorMessage,
      stack: errorStack,
      friendId: friendIdForLog
    })
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update hangout frequency',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}

