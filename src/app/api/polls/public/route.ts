import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/polls/public - Get public polls (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pollId = searchParams.get('pollId')
    const hangoutId = searchParams.get('hangoutId')
    const contentId = searchParams.get('contentId')

    let where: any = {
      visibility: 'PUBLIC',
      status: 'ACTIVE'
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
    console.error('Error fetching public polls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch public polls', message: error.message },
      { status: 500 }
    )
  }
}








