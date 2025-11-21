import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { getSharedHangouts } from '@/lib/services/friend-relationship-service'
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

    const { id: friendId } = await params

    // Verify friendship exists
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

    // Get shared hangouts
    const sharedHangouts = await getSharedHangouts(user.id, friendId)

    return NextResponse.json({
      success: true,
      hangouts: sharedHangouts,
      count: sharedHangouts.length
    })
  } catch (error) {
    logger.error('Error fetching friend hangouts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch friend hangouts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


