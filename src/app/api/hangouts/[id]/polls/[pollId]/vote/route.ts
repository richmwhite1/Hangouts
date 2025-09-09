import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const voteSchema = z.object({
  option: z.string().min(1, 'Option is required'),
  ranking: z.number().int().min(1).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; pollId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if poll exists and is active
    const poll = await db.hangoutPoll.findUnique({
      where: { id: params.pollId },
      include: {
        hangout: true,
        votes: true,
      }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    if (poll.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Poll is not active' },
        { status: 400 }
      )
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      return NextResponse.json(
        { error: 'Poll has expired' },
        { status: 400 }
      )
    }

    // Check if user is a participant of the hangout
    const participant = await db.hangoutParticipant.findUnique({
      where: {
        hangoutId_userId: {
          hangoutId: params.id,
          userId: payload.userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a participant of this hangout' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = voteSchema.parse(body)

    // Validate that the option exists in the poll
    if (!poll.options.includes(validatedData.option)) {
      return NextResponse.json(
        { error: 'Invalid option selected' },
        { status: 400 }
      )
    }

    // Check if user has already voted
    const existingVote = await db.pollVote.findUnique({
      where: {
        pollId_userId: {
          pollId: params.pollId,
          userId: payload.userId
        }
      }
    })

    if (existingVote && !poll.allowMultiple) {
      return NextResponse.json(
        { error: 'You have already voted on this poll' },
        { status: 400 }
      )
    }

    // Create or update the vote
    const vote = await db.pollVote.upsert({
      where: {
        pollId_userId: {
          pollId: params.pollId,
          userId: payload.userId
        }
      },
      update: {
        option: validatedData.option,
        ranking: validatedData.ranking,
      },
      create: {
        pollId: params.pollId,
        userId: payload.userId,
        option: validatedData.option,
        ranking: validatedData.ranking,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          }
        }
      }
    })

    // Get updated poll with vote counts
    const updatedPoll = await db.hangoutPoll.findUnique({
      where: { id: params.pollId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          }
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              }
            }
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    return NextResponse.json({ 
      vote, 
      poll: updatedPoll,
      message: 'Vote recorded successfully' 
    })
  } catch (error) {
    console.error('Error voting on poll:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pollId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if poll exists
    const poll = await db.hangoutPoll.findUnique({
      where: { id: params.pollId }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator or has permission
    if (poll.creatorId !== payload.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own polls' },
        { status: 403 }
      )
    }

    // Delete the poll (votes will be cascade deleted)
    await db.hangoutPoll.delete({
      where: { id: params.pollId }
    })

    return NextResponse.json({ message: 'Poll deleted successfully' })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json(
      { error: 'Failed to delete poll' },
      { status: 500 }
    )
  }
}



