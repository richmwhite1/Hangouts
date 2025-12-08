import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function DELETE(
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

    const { id: friendshipId } = await params

    // Find the friendship
    const friendship = await db.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { userId: user.id },
          { friendId: user.id }
        ],
        status: 'ACTIVE'
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })
    }

    // Delete both sides of the friendship (bidirectional)
    await db.friendship.deleteMany({
      where: {
        OR: [
          { userId: friendship.userId, friendId: friendship.friendId },
          { userId: friendship.friendId, friendId: friendship.userId }
        ]
      }
    })

    logger.info('Friendship removed', { 
      friendshipId, 
      userId: user.id, 
      friendId: friendship.userId === user.id ? friendship.friendId : friendship.userId 
    })

    return NextResponse.json({
      success: true,
      message: 'Friendship removed'
    })
  } catch (error) {
    logger.error('Error removing friendship:', error)
    return NextResponse.json(
      { error: 'Failed to remove friendship' },
      { status: 500 }
    )
  }
}











