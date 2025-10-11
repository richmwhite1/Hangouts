import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

import { logger } from '@/lib/logger'
// Validation schema
const VoteSchema = z.object({
  option: z.string().min(1, 'Option is required')
})

// POST /api/hangouts/[id]/polls/[pollId]/vote - Vote on a poll
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
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

    const { id: hangoutId, pollId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = VoteSchema.parse(body)

    // Check if poll exists
    const poll = await db.polls.findUnique({
      where: { id: pollId },
      include: { votes: true }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Check if poll is still active
    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Poll is not active' }, { status: 400 })
    }

    // Check if option is valid
    const validOptions = poll.options.map((opt: any) => opt.title || opt)
    if (!validOptions.includes(validatedData.option)) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
    }

    // Check if user already voted
    const existingVote = await db.pollVote.findFirst({
      where: {
        pollId: pollId,
        userId: user.id
      }
    })

    if (existingVote) {
      // Update existing vote
      await db.pollVote.update({
        where: { id: existingVote.id },
        data: { option: validatedData.option }
      })
    } else {
      // Create new vote
      await db.pollVote.create({
        data: {
          pollId: pollId,
          userId: user.id,
          option: validatedData.option
        }
      })
    }

    // Get updated poll with votes
    const updatedPoll = await db.polls.findUnique({
      where: { id: pollId },
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
    })

    return NextResponse.json({
      success: true,
      poll: updatedPoll,
      message: 'Vote recorded successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    logger.error('Error voting on poll:', error);
    return NextResponse.json({ error: 'Failed to vote', details: error.message }, { status: 500 })
  }
}

// Get user's vote for a poll
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
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

    const { id: hangoutId, pollId } = await params

    // Get user's votes for this poll
    const votes = await db.pollVote.findMany({
      where: {
        pollId,
        userId: user.id
      },
      select: {
        option: true
      }
    })

    return NextResponse.json({
      hasVoted: votes.length > 0,
      userVotes: votes.map(vote => vote.option)
    })
  } catch (error) {
    logger.error('Error getting user votes:', error);
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 })
  }
}