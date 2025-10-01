import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { checkAndFinalizeIfReady, calculateWinner } from '@/lib/hangout-flow'

const VoteSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required'),
  action: z.enum(['add', 'remove', 'preferred', 'toggle']).optional().default('add')
})

// POST /api/hangouts/[id]/vote - Cast a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: hangoutId } = await params
    const body = await request.json()
    const { optionId, action } = VoteSchema.parse(body)

    // Get hangout with polls
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        polls: true
      }
    })

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Hangout not found', 'Hangout does not exist'), { status: 404 })
    }

    const polls = hangout.polls
    if (!polls || polls.length === 0) {
      return NextResponse.json(createErrorResponse('No poll found', 'This hangout does not have a poll'), { status: 404 })
    }

    const poll = polls[0]

    // Check if hangout is in polling state
    if (poll.status !== 'ACTIVE') {
      return NextResponse.json(createErrorResponse('Voting not allowed', 'Poll is not active'), { status: 400 })
    }

    // Handle toggle voting system (click to vote/unvote)
    if (action === 'add' || action === 'toggle') {
      // Check if user already voted for this option
      const existingVote = await db.pollVote.findFirst({
        where: {
          pollId: poll.id,
          userId: payload.userId,
          option: optionId
        }
      })

      if (existingVote) {
        // Remove vote (toggle off)
        await db.pollVote.delete({
          where: { id: existingVote.id }
        })
      } else {
        // Add vote (toggle on)
        await db.pollVote.create({
          data: {
            id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            pollId: poll.id,
            userId: payload.userId,
            option: optionId
          }
        })
      }
    } else if (action === 'remove') {
      // Remove vote for this option
      await db.pollVote.deleteMany({
        where: {
          pollId: poll.id,
          userId: payload.userId,
          option: optionId
        }
      })
    } else if (action === 'preferred') {
      // Handle preferred vote - first ensure user has voted for this option
      const existingVote = await db.pollVote.findFirst({
        where: {
          pollId: poll.id,
          userId: payload.userId,
          option: optionId
        }
      })

      if (!existingVote) {
        // User must vote first before marking as preferred
        await db.pollVote.create({
          data: {
            id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            pollId: poll.id,
            userId: payload.userId,
            option: optionId,
            isPreferred: true
          }
        })
      } else {
        // Toggle preferred status
        await db.pollVote.update({
          where: { id: existingVote.id },
          data: { isPreferred: !existingVote.isPreferred }
        })
      }

      // Remove preferred status from all other votes by this user
      await db.pollVote.updateMany({
        where: {
          pollId: poll.id,
          userId: payload.userId,
          option: { not: optionId }
        },
        data: { isPreferred: false }
      })
    }

    // Get updated hangout with polls
    const updatedHangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        polls: true
      }
    })

    // Get votes for this poll
    const pollVotes = await db.pollVote.findMany({
      where: { pollId: poll.id }
    })

    // Group votes by user for multiple voting
    const userVotes: Record<string, string[]> = {}
    const userPreferred: Record<string, string> = {}
    
    pollVotes.forEach(vote => {
      if (!userVotes[vote.userId]) {
        userVotes[vote.userId] = []
      }
      userVotes[vote.userId].push(vote.option)
      
      // Track preferred votes
      if (vote.isPreferred) {
        userPreferred[vote.userId] = vote.option
      }
    })

    // For consensus checking, we'll use the first vote of each user
    const votes = pollVotes.reduce((acc, vote) => {
      if (!acc[vote.userId]) {
        acc[vote.userId] = vote.option
      }
      return acc
    }, {} as Record<string, string>)

    // Get participants for consensus checking
    const participants = await db.content_participants.findMany({
      where: { contentId: hangoutId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    const hangoutWithVotes = {
      ...updatedHangout,
      votes,
      userVotes,
      userPreferred,
      participants: participants.map(p => ({
        id: p.id,
        user: p.users,
        rsvpStatus: p.rsvpStatus,
        role: p.role
      })),
      options: poll.options as any[] || []
    }

    if (checkAndFinalizeIfReady(hangoutWithVotes)) {
      // Calculate winner and finalize
      const winner = calculateWinner(hangoutWithVotes)
      
      // Update poll status and store finalized option
      await db.polls.update({
        where: { id: poll.id },
        data: { 
          status: 'CONSENSUS_REACHED',
          options: [winner] // Store the winner as the only option
        }
      })

      // Update hangout to RSVP phase by creating RSVP records for all participants
      const allParticipants = await db.content_participants.findMany({
        where: { contentId: hangoutId }
      })

      // Create RSVP records for all participants (only if they don't exist)
      const existingRsvps = await db.rsvp.findMany({
        where: { contentId: hangoutId }
      })
      
      const existingUserIds = existingRsvps.map(rsvp => rsvp.userId)
      const newRsvpData = allParticipants
        .filter(participant => !existingUserIds.includes(participant.userId))
        .map(participant => ({
          contentId: hangoutId,
          userId: participant.userId,
          status: 'PENDING' as const,
          respondedAt: null,
        }))

      if (newRsvpData.length > 0) {
        await db.rsvp.createMany({
          data: newRsvpData
        })
      }

      return NextResponse.json(createSuccessResponse({
        voteCast: true,
        finalized: true,
        winner,
        state: 'confirmed' // Indicate transition to RSVP phase
      }, 'Vote cast and hangout finalized! RSVP phase has begun.'))
    }

    return NextResponse.json(createSuccessResponse({
      voteCast: true,
      finalized: false
    }, 'Vote cast successfully!'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.errors)), { status: 400 })
    }
    console.error('Error casting vote:', error)
    return NextResponse.json(createErrorResponse('Failed to cast vote', error.message), { status: 500 })
  }
}
