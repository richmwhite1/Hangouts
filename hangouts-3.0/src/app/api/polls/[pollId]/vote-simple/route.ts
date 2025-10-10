import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const VoteSchema = z.object({
  optionId: z.string().min(1),
  voteType: z.enum(['SINGLE', 'MULTIPLE', 'RANKED', 'SCORED', 'QUADRATIC', 'DELEGATED']).default('SINGLE'),
  weight: z.number().min(0.1).max(10).default(1.0)
})

// POST /api/polls/[pollId]/vote-simple - Cast vote with JWT auth
export async function POST(
  request: NextRequest,
  { params }: { params: { pollId: string } }
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

    const { pollId } = await params
    const body = await request.json()
    const validatedData = VoteSchema.parse(body)

    // Check if poll exists and is active
    const poll = await db.polls.findUnique({
      where: { id: pollId },
      include: {
        consensusConfig: true,
        pollOptions: true,
        participants: true
      }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Poll is not active' }, { status: 400 })
    }

    // Check if option exists
    const option = poll.pollOptions.find(opt => opt.id === validatedData.optionId)
    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }

    // Check if user can vote, or add them as a participant if they're not already one
    let participant = poll.participants.find(p => p.userId === user.id)
    if (!participant) {
      // Auto-add user as a participant if they're not already one
      participant = await db.pollParticipant.create({
        data: {
          pollId,
          userId: user.id,
          status: 'ACTIVE',
          canVote: true,
          canDelegate: false
        }
      })
    } else if (!participant.canVote) {
      return NextResponse.json({ error: 'User cannot vote' }, { status: 403 })
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Use transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Check if user already voted on this option
      const existingVote = await tx.pollVote.findFirst({
        where: { 
          pollId, 
          userId: user.id, 
          optionId: validatedData.optionId 
        }
      })

      let vote
      if (existingVote) {
        // Remove existing vote (toggle off)
        await tx.pollVote.delete({
          where: { id: existingVote.id }
        })
        vote = null // Indicate vote was removed
      } else {
        // For SINGLE vote type, delete all other votes first
        if (validatedData.voteType === 'SINGLE') {
          await tx.pollVote.deleteMany({
            where: { pollId, userId: user.id }
          })
        }
        
        // Create new vote
        vote = await tx.pollVote.create({
          data: {
            pollId,
            userId: user.id,
            option: option.text, // Keep old format for compatibility
            optionId: validatedData.optionId,
            voteType: validatedData.voteType,
            weight: validatedData.weight,
            ipAddress,
            userAgent
          }
        })
      }

      // Update participant status
      await tx.pollParticipant.update({
        where: { pollId_userId: { pollId, userId: user.id } },
        data: { 
          status: 'VOTED',
          lastActiveAt: new Date()
        }
      })

      return vote
    })

    return NextResponse.json({
      success: true,
      vote: result,
      message: result ? 'Vote cast successfully' : 'Vote removed successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error casting vote:', error)
    return NextResponse.json({ error: 'Failed to cast vote', details: error.message }, { status: 500 })
  }
}
