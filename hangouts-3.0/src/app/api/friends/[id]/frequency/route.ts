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

    // Validate frequency value
    const validFrequencies = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUALLY', 'SOMETIMES', null]
    if (frequency !== null && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      )
    }

    // Find the friendship where current user is the userId (not friendId)
    const friendship = await db.friendship.findFirst({
      where: {
        userId: user.id,
        friendId: friendId,
        status: 'ACTIVE'
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
    }

    // Update the frequency
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
        }
      }
    })

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
  } catch (error) {
    logger.error('Error updating hangout frequency:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update hangout frequency',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

