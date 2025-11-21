import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: friendshipId } = await params

    // Find the friendship
    const friendship = await db.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { userId: user.id },
          { friendId: user.id }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })
    }

    // Delete both sides of the friendship
    await db.friendship.deleteMany({
      where: {
        OR: [
          { userId: friendship.userId, friendId: friendship.friendId },
          { userId: friendship.friendId, friendId: friendship.userId }
        ]
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Friendship removed'
    })
  } catch (error) {
    logger.error('Error removing friendship:', error);
    return NextResponse.json(
      { error: 'Failed to remove friendship' },
      { status: 500 }
    )
  }
}