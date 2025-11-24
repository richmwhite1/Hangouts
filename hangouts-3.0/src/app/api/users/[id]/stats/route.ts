import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // Get user's hosted hangouts count
    const hostedHangoutsCount = await db.content.count({
      where: {
        type: 'HANGOUT',
        creatorId: userId
      }
    })

    // Get user's hosted events count
    const hostedEventsCount = await db.content.count({
      where: {
        type: 'EVENT',
        creatorId: userId
      }
    })

    // Get user's attended hangouts count
    const attendedHangoutsCount = await db.content_participants.count({
      where: {
        userId: userId,
        content: {
          type: 'HANGOUT'
        }
      }
    })

    // Get user's attended events count
    const attendedEventsCount = await db.content_participants.count({
      where: {
        userId: userId,
        content: {
          type: 'EVENT'
        }
      }
    })

    // Get user's friends count
    const friendsCount = await db.friendship.count({
      where: {
        OR: [
          { userId: userId },
          { friendId: userId }
        ],
        status: 'ACTIVE'
      }
    })

    // Get total likes received
    const totalLikes = await db.content_likes.count({
      where: {
        content: {
          creatorId: userId
        }
      }
    })

    // Get total comments received
    const totalComments = await db.comments.count({
      where: {
        content: {
          creatorId: userId
        }
      }
    })

    const stats = {
      friendsCount,
      hostedHangoutsCount,
      attendedHangoutsCount,
      hostedEventsCount,
      attendedEventsCount,
      totalLikes,
      totalComments
    }

    return NextResponse.json(createSuccessResponse({ stats }, 'User stats retrieved successfully'))

  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      createErrorResponse(
        'Failed to fetch user stats', 
        error?.message || 'Unknown error'
      ), 
      { status: 500 }
    )
  }
}

