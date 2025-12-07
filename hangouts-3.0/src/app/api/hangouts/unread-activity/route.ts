import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET /api/hangouts/unread-activity?ids=id1,id2,id3 - Get unread activity for multiple hangouts
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json(
        createErrorResponse('Missing parameter', 'ids parameter is required'),
        { status: 400 }
      )
    }

    const hangoutIds = idsParam.split(',').filter(id => id.trim())

    if (hangoutIds.length === 0) {
      return NextResponse.json(createSuccessResponse([], 'No hangouts to check'))
    }

    // Get last viewed timestamps for these hangouts
    const viewRecords = await db.hangoutView.findMany({
      where: {
        userId: user.id,
        hangoutId: {
          in: hangoutIds
        }
      },
      select: {
        hangoutId: true,
        lastViewedAt: true
      }
    })

    const viewMap = new Map(viewRecords.map(v => [v.hangoutId, v.lastViewedAt]))

    // Get activity counts for each hangout
    const activityData = await Promise.all(
      hangoutIds.map(async (hangoutId) => {
        const lastViewed = viewMap.get(hangoutId) || new Date(0) // Beginning of time if never viewed

        // Count new messages since last view
        const newMessagesCount = await db.messages.count({
          where: {
            contentId: hangoutId,
            userId: { not: user.id }, // Don't count own messages
            createdAt: { gt: lastViewed }
          }
        })

        // Count new photos since last view
        const newPhotosCount = await db.photos.count({
          where: {
            contentId: hangoutId,
            userId: { not: user.id }, // Don't count own photos
            createdAt: { gt: lastViewed }
          }
        })

        // Count new comments since last view
        const newCommentsCount = await db.comments.count({
          where: {
            contentId: hangoutId,
            userId: { not: user.id }, // Don't count own comments
            createdAt: { gt: lastViewed }
          }
        })

        // Get last activity timestamp
        const content = await db.content.findUnique({
          where: { id: hangoutId },
          select: { lastActivityAt: true }
        })

        return {
          hangoutId,
          newMessagesCount,
          newPhotosCount,
          newCommentsCount,
          lastViewedAt: viewMap.get(hangoutId)?.toISOString() || null,
          lastActivityAt: content?.lastActivityAt?.toISOString() || null
        }
      })
    )

    return NextResponse.json(createSuccessResponse(activityData, 'Unread activity retrieved'))
  } catch (error) {
    logger.error('Error getting unread activity:', error)
    return NextResponse.json(
      createErrorResponse('Failed to get unread activity', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    )
  }
}

