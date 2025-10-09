import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/polls/friends - Get friends-only polls (requires authentication)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pollId = searchParams.get('pollId')
    const hangoutId = searchParams.get('hangoutId')
    const contentId = searchParams.get('contentId')

    // Get user's friends
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { user1Id: payload.userId },
          { user2Id: payload.userId }
        ]
      }
    })

    const friendIds = friendships.map(f => 
      f.user1Id === payload.userId ? f.user2Id : f.user1Id
    )

    let where: any = {
      OR: [
        { visibility: 'FRIENDS' },
        { visibility: 'PUBLIC' }
      ],
      status: 'ACTIVE',
      OR: [
        { creatorId: payload.userId },
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
    console.error('Error fetching friends polls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends polls', message: error.message },
      { status: 500 }
    )
  }
}


















