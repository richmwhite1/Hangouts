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
  let user: any = null
  let friendId: string = 'unknown'
  
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      logger.warn('Unauthorized: No clerk user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = await getClerkApiUser()
    if (!user) {
      logger.warn('User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const paramsResolved = await params
    friendId = paramsResolved.id
    
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.error('Failed to parse request body', { error: parseError })
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
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

    // First, validate that the friend user exists
    let friendUser: any = null
    try {
      friendUser = await db.user.findUnique({
        where: { id: friendId },
        select: { id: true, name: true, isActive: true }
      })
    } catch (userError) {
      logger.error('Error finding friend user', {
        error: userError instanceof Error ? userError.message : String(userError),
        friendId
      })
    }

    if (!friendUser) {
      logger.warn('Friend user not found', { userId: user.id, friendId })
      return NextResponse.json(
        { error: 'Friend not found' },
        { status: 404 }
      )
    }

    if (!friendUser.isActive) {
      logger.warn('Friend user is inactive', { userId: user.id, friendId })
      return NextResponse.json(
        { error: 'Friend account is inactive' },
        { status: 400 }
      )
    }

    // Find the friendship where current user is userId (preferred)
    let friendship: any = null
    let inactiveFriendship: any = null
    
    try {
      // First try to find active friendship
      friendship = await db.friendship.findFirst({
        where: {
          userId: user.id,
          friendId: friendId,
          status: 'ACTIVE'
        }
      })
      
      // If not found, check if there's an inactive friendship (for better error message)
      if (!friendship) {
        inactiveFriendship = await db.friendship.findFirst({
          where: {
            userId: user.id,
            friendId: friendId
          }
        })
      }
    } catch (findError) {
      logger.error('Error finding friendship (forward)', {
        error: findError instanceof Error ? findError.message : String(findError),
        userId: user.id,
        friendId
      })
    }

    // If not found, try the reverse direction (bidirectional friendships)
    if (!friendship) {
      try {
        friendship = await db.friendship.findFirst({
          where: {
            userId: friendId,
            friendId: user.id,
            status: 'ACTIVE'
          }
        })
        
        // If still not found, check reverse direction for inactive
        if (!friendship && !inactiveFriendship) {
          inactiveFriendship = await db.friendship.findFirst({
            where: {
              userId: friendId,
              friendId: user.id
            }
          })
        }
      } catch (findError) {
        logger.error('Error finding friendship (reverse)', {
          error: findError instanceof Error ? findError.message : String(findError),
          userId: user.id,
          friendId
        })
      }
    }

    if (!friendship) {
      // Provide more helpful error message
      if (inactiveFriendship) {
        logger.warn('Friendship exists but is not active', { 
          userId: user.id, 
          friendId, 
          friendName: friendUser.name,
          status: inactiveFriendship.status 
        })
        return NextResponse.json(
          { error: `Friendship exists but is ${inactiveFriendship.status.toLowerCase()}. You must have an active friendship to set a hangout goal.` },
          { status: 400 }
        )
      } else {
        logger.warn('Friendship not found', { userId: user.id, friendId, friendName: friendUser.name })
        return NextResponse.json(
          { error: 'Friend not found. You must be friends with this user to set a hangout goal.' },
          { status: 404 }
        )
      }
    }
    
    logger.info('Found friendship', {
      friendshipId: friendship.id,
      userId: friendship.userId,
      friendId: friendship.friendId,
      hasFrequencyField: 'desiredHangoutFrequency' in friendship
    })

    // Update the frequency
    // Note: We update whichever friendship record we found
    // In a bidirectional system, both records should ideally be kept in sync
    try {
      // First, try a simple update without include to avoid relation issues
      await db.friendship.update({
        where: { id: friendship.id },
        data: {
          desiredHangoutFrequency: frequency
        }
      })
      
      // Then fetch the updated record with relations if needed
      const updatedFriendship = await db.friendship.findUnique({
        where: { id: friendship.id },
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
      const errorDetails = updateError instanceof Error 
        ? { message: updateError.message, name: updateError.name, stack: updateError.stack }
        : { error: String(updateError) }
      
      logger.warn('Update with include failed, trying without include', { 
        ...errorDetails,
        friendshipId: friendship.id
      })
      
      let updatedFriendship: any
      try {
        updatedFriendship = await db.friendship.update({
          where: { id: friendship.id },
          data: {
            desiredHangoutFrequency: frequency
          }
        })
      } catch (simpleUpdateError) {
        const simpleErrorDetails = simpleUpdateError instanceof Error
          ? { message: simpleUpdateError.message, name: simpleUpdateError.name }
          : { error: String(simpleUpdateError) }
        
        logger.error('Simple update also failed', {
          ...simpleErrorDetails,
          friendshipId: friendship.id,
          frequency
        })
        
        // Return the original error
        throw updateError
      }

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
    
    // Check for Prisma errors
    let prismaErrorCode: string | undefined
    let prismaErrorMeta: any
    if (error && typeof error === 'object' && 'code' in error) {
      prismaErrorCode = (error as any).code
      prismaErrorMeta = (error as any).meta
    }
    
    logger.error('Error updating hangout frequency:', {
      error: errorMessage,
      stack: errorStack,
      friendId,
      userId: user?.id,
      prismaErrorCode,
      prismaErrorMeta,
      errorName: error instanceof Error ? error.name : undefined
    })
    
    // Provide more specific error messages
    let userFacingError = 'Failed to update hangout frequency'
    if (prismaErrorCode === 'P2025') {
      userFacingError = 'Friendship not found'
    } else if (prismaErrorCode === 'P2003') {
      userFacingError = 'Database constraint error - please contact support'
    } else if (errorMessage.includes('Unknown column') || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      userFacingError = 'Database schema mismatch - migration may be needed'
    }
    
    return NextResponse.json(
      {
        success: false,
        error: userFacingError,
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          prismaErrorCode,
          stack: errorStack 
        })
      },
      { status: 500 }
    )
  }
}

