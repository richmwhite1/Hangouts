import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Cleanup route to remove invalid friend requests
// This should be called manually or via a cron job to clean up data issues
export async function POST(_request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Find and delete invalid self-requests (senderId === receiverId)
    // Since Prisma doesn't support field comparison in where clauses, we need to fetch and filter
    const allRequests = await db.friendRequest.findMany({
      select: {
        id: true,
        senderId: true,
        receiverId: true
      }
    })

    const invalidRequestIds = allRequests
      .filter(req => req.senderId === req.receiverId)
      .map(req => req.id)

    const deletedCount = { count: 0 }
    if (invalidRequestIds.length > 0) {
      const result = await db.friendRequest.deleteMany({
        where: {
          id: { in: invalidRequestIds }
        }
      })
      deletedCount.count = result.count
    }

    logger.info(`Cleaned up ${deletedCount.count} invalid friend requests`)

    return NextResponse.json({
      success: true,
      deletedCount: deletedCount.count,
      message: `Cleaned up ${deletedCount.count} invalid friend requests`
    })
  } catch (error) {
    logger.error('Error cleaning up friend requests:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup friend requests' },
      { status: 500 }
    )
  }
}

