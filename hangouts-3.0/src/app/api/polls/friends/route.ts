import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// GET /api/polls/friends - Get friends-only polls (requires authentication)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pollId = searchParams.get('pollId')
    const hangoutId = searchParams.get('hangoutId')
    const contentId = searchParams.get('contentId')

    // Get user's friends
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { user1Id: user.id },
          { user2Id: user.id }
        ]
      }
    })

    const friendIds = friendships.map(f => 
      f.user1Id === user.id ? f.user2Id : f.user1Id
    )

    let where: any = {
      OR: [
        { visibility: 'FRIENDS' },
        { visibility: 'PUBLIC' }
      ],
      status: 'ACTIVE',
      OR: [
        { creatorId: user.id },
        { creatorId: { in: friendIds } }
      ]
    }

    // If specific poll ID is requested
    if (pollId) {
      where.id = pollId
    }
    // If hangout ID is provided
    else if (hangoutId) {
      where.hangoutId = hangoutId
    }
    // If content ID is provided, look up hangout details ID
    else if (contentId) {
      const hangout = await db.content.findUnique({
        where: { id: contentId },
        include: { hangout_details: true }
      })
      if (hangout?.hangout_details) {
        where.hangoutId = hangout.hangout_details.id
      } else {
        return NextResponse.json({
          success: true,
          polls: [],
          message: 'No hangout found for this content ID'
        })
      }
    }

    const polls = await db.polls.findMany({
      where,
      include: {
        pollOptions: {
          include: {
            votes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            votes: true,
            pollOptions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      polls: polls
    })

  } catch (error) {
    logger.error('Error fetching friends polls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends polls', message: error.message },
      { status: 500 }
    )
  }
}




















