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

    // Find the friendship where current user is userId (preferred)
    let friendship: any = null
    try {
      friendship = await db.friendship.findFirst({
        where: {
          userId: user.id,
          friendId: friendId,
          status: 'ACTIVE'
        }
      })
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
      } catch (findError) {
        logger.error('Error finding friendship (reverse)', {
          error: findError instanceof Error ? findError.message : String(findError),
          userId: user.id,
          friendId
        })
      }
    }

    if (!friendship) {
      logger.warn('Friendship not found', { userId: user.id, friendId })
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
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

