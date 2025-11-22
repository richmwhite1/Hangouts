import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { getHangoutStats } from '@/lib/services/friend-relationship-service'
import { logger } from '@/lib/logger'

export async function PATCH(
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

    // Find the friendship (check both directions)
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: friendId },
          { userId: friendId, friendId: user.id }
        ],
        status: 'ACTIVE'
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
    }

    // Update the friendship frequency
    // Note: We update the friendship where current user is userId
    const updatedFriendship = await db.friendship.updateMany({
      where: {
        userId: user.id,
        friendId: friendId,
        status: 'ACTIVE'
      },
      data: {
        desiredHangoutFrequency: frequency || null
      }
    })

    // If no friendship found with user as userId, try the reverse
    if (updatedFriendship.count === 0) {
      await db.friendship.updateMany({
        where: {
          userId: friendId,
          friendId: user.id,
          status: 'ACTIVE'
        },
        data: {
          desiredHangoutFrequency: frequency || null
        }
      })
    }

    // Get updated stats
    const stats = await getHangoutStats(user.id, friendId)

    return NextResponse.json({
      success: true,
      frequency: frequency || null,
      stats
    })
  } catch (error) {
    logger.error('Error updating friendship frequency:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update frequency',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


