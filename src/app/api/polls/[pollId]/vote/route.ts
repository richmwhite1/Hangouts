import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const VoteSchema = z.object({
  optionId: z.string().min(1),
  voteType: z.enum(['SINGLE', 'MULTIPLE', 'RANKED', 'SCORED', 'QUADRATIC', 'DELEGATED']).default('SINGLE'),
  ranking: z.number().min(1).optional(),
  score: z.number().min(1).max(5).optional(),
  weight: z.number().min(0.1).max(10).default(1.0),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  comment: z.string().max(500).optional()
})

// POST /api/polls/[pollId]/vote - Cast vote
export async function POST(
  request: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { pollId } = params
    const body = await request.json()
    const validatedData = VoteSchema.parse(body)

    // Check if poll exists and is active
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        consensusConfig: true,
        pollOptions: true
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

    // Check if user can vote
    const participant = await prisma.pollParticipant.findUnique({
      where: { pollId_userId: { pollId, userId: payload.userId } }
    })

    if (!participant || !participant.canVote) {
      return NextResponse.json({ error: 'User cannot vote' }, { status: 403 })
    }

    // Validate vote type constraints
    if (validatedData.voteType === 'RANKED' && !validatedData.ranking) {
      return NextResponse.json({ error: 'Ranking required for ranked vote' }, { status: 400 })
    }

    if (validatedData.voteType === 'SCORED' && !validatedData.score) {
      return NextResponse.json({ error: 'Score required for scored vote' }, { status: 400 })
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing vote if any
      await tx.pollVote.deleteMany({
        where: { pollId, userId: payload.userId }
      })

      // Create new vote
      const vote = await tx.pollVote.create({
        data: {
          pollId,
          userId: payload.userId,
          option: option.text, // Keep old format for compatibility
          optionId: validatedData.optionId,
          voteType: validatedData.voteType,
          ranking: validatedData.ranking,
          score: validatedData.score,
          weight: validatedData.weight,
          sentiment: validatedData.sentiment,
          comment: validatedData.comment,
          ipAddress,
          userAgent
        }
      })

      // Update participant status
      await tx.pollParticipant.update({
        where: { pollId_userId: { pollId, userId: payload.userId } },
        data: { 
          status: 'VOTED',
          lastActiveAt: new Date()
        }
      })

      // Create audit log
      await tx.voteAudit.create({
        data: {
          pollId,
          userId: payload.userId,
          action: 'VOTE_CAST',
          newValue: {
            optionId: validatedData.optionId,
            voteType: validatedData.voteType,
            ranking: validatedData.ranking,
            score: validatedData.score,
            weight: validatedData.weight,
            sentiment: validatedData.sentiment,
            comment: validatedData.comment
          },
          ipAddress,
          userAgent
        }
      })

      return vote
    })

    // Calculate updated consensus
    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        pollOptions: {
          include: { votes: true }
        },
        participants: true,
        consensusConfig: true
      }
    })

    if (updatedPoll) {
      const consensus = calculateConsensus(updatedPoll)
      
      // Save consensus history
      await prisma.consensusHistory.create({
        data: {
          pollId,
          consensusLevel: consensus.consensusLevel,
          totalVotes: consensus.totalVotes,
          participantCount: consensus.participantCount,
          leadingOption: consensus.leadingOption,
          timeToConsensus: consensus.timeToConsensus,
          velocity: consensus.velocity
        }
      })

      // Broadcast vote cast
      // pollingWSManager.broadcastVoteCast(pollId, {
      //   pollId,
      //   optionId: validatedData.optionId,
      //   userId: payload.userId,
      //   voteType: validatedData.voteType,
      //   sentiment: validatedData.sentiment,
      //   comment: validatedData.comment,
      //   voteCount: consensus.totalVotes,
      //   consensusLevel: consensus.consensusLevel
      // })

      // Check if consensus reached
      if (consensus.consensusLevel >= (poll.consensusConfig?.threshold || 50)) {
        // Update poll status
        await db.poll.update({
          where: { id: pollId },
          data: { status: 'CONSENSUS_REACHED' }
        })

        // Broadcast consensus reached
        // pollingWSManager.broadcastConsensusReached(pollId, {
        //   pollId,
        //   winningOption: consensus.leadingOption,
        //   consensusLevel: consensus.consensusLevel,
        //   totalVotes: consensus.totalVotes,
        //   participantCount: consensus.participantCount
        // })
      }
    }

    return NextResponse.json({
      vote: result,
      consensus: updatedPoll ? calculateConsensus(updatedPoll) : null
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error casting vote:', error)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}

// PUT /api/polls/[pollId]/vote - Change vote
export async function PUT(
  request: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pollId } = params
    const body = await request.json()
    const validatedData = VoteSchema.parse(body)

    // Check if poll exists and is active
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: { consensusConfig: true, pollOptions: true }
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

    // Get existing vote
    const existingVote = await prisma.pollVote.findFirst({
      where: { pollId, userId: payload.userId }
    })

    if (!existingVote) {
      return NextResponse.json({ error: 'No vote found to change' }, { status: 404 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Update vote
    const result = await prisma.$transaction(async (tx) => {
      // Update vote
      const updatedVote = await tx.pollVote.update({
        where: { id: existingVote.id },
        data: {
          option: option.text,
          optionId: validatedData.optionId,
          voteType: validatedData.voteType,
          ranking: validatedData.ranking,
          score: validatedData.score,
          weight: validatedData.weight,
          sentiment: validatedData.sentiment,
          comment: validatedData.comment,
          updatedAt: new Date()
        }
      })

      // Create audit log
      await tx.voteAudit.create({
        data: {
          pollId,
          userId: payload.userId,
          action: 'VOTE_CHANGED',
          oldValue: {
            optionId: existingVote.optionId,
            voteType: existingVote.voteType,
            ranking: existingVote.ranking,
            score: existingVote.score,
            weight: existingVote.weight,
            sentiment: existingVote.sentiment,
            comment: existingVote.comment
          },
          newValue: {
            optionId: validatedData.optionId,
            voteType: validatedData.voteType,
            ranking: validatedData.ranking,
            score: validatedData.score,
            weight: validatedData.weight,
            sentiment: validatedData.sentiment,
            comment: validatedData.comment
          },
          ipAddress,
          userAgent
        }
      })

      return updatedVote
    })

    // Calculate updated consensus and broadcast
    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        pollOptions: { include: { votes: true } },
        participants: true,
        consensusConfig: true
      }
    })

    if (updatedPoll) {
      const consensus = calculateConsensus(updatedPoll)
      
      // Save consensus history
      await prisma.consensusHistory.create({
        data: {
          pollId,
          consensusLevel: consensus.consensusLevel,
          totalVotes: consensus.totalVotes,
          participantCount: consensus.participantCount,
          leadingOption: consensus.leadingOption,
          timeToConsensus: consensus.timeToConsensus,
          velocity: consensus.velocity
        }
      })

      // Broadcast vote changed
      // pollingWSManager.broadcastVoteChanged(pollId, {
      //   pollId,
      //   optionId: validatedData.optionId,
      //   userId: payload.userId,
      //   oldOptionId: existingVote.optionId,
      //   voteCount: consensus.totalVotes,
      //   consensusLevel: consensus.consensusLevel
      // })
    }

    return NextResponse.json({
      vote: result,
      consensus: updatedPoll ? calculateConsensus(updatedPoll) : null
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error changing vote:', error)
    return NextResponse.json({ error: 'Failed to change vote' }, { status: 500 })
  }
}

// DELETE /api/polls/[pollId]/vote - Delete vote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pollId } = params

    // Check if poll exists and is active
    const poll = await db.poll.findUnique({
      where: { id: pollId }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Poll is not active' }, { status: 400 })
    }

    // Get existing vote
    const existingVote = await prisma.pollVote.findFirst({
      where: { pollId, userId: payload.userId }
    })

    if (!existingVote) {
      return NextResponse.json({ error: 'No vote found to delete' }, { status: 404 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Delete vote
    await prisma.$transaction(async (tx) => {
      // Delete vote
      await tx.pollVote.delete({
        where: { id: existingVote.id }
      })

      // Update participant status
      await tx.pollParticipant.update({
        where: { pollId_userId: { pollId, userId: payload.userId } },
        data: { 
          status: 'ACTIVE',
          lastActiveAt: new Date()
        }
      })

      // Create audit log
      await tx.voteAudit.create({
        data: {
          pollId,
          userId: payload.userId,
          action: 'VOTE_DELETED',
          oldValue: {
            optionId: existingVote.optionId,
            voteType: existingVote.voteType,
            ranking: existingVote.ranking,
            score: existingVote.score,
            weight: existingVote.weight,
            sentiment: existingVote.sentiment,
            comment: existingVote.comment
          },
          ipAddress,
          userAgent
        }
      })
    })

    // Calculate updated consensus and broadcast
    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        pollOptions: { include: { votes: true } },
        participants: true,
        consensusConfig: true
      }
    })

    if (updatedPoll) {
      const consensus = calculateConsensus(updatedPoll)
      
      // Save consensus history
      await prisma.consensusHistory.create({
        data: {
          pollId,
          consensusLevel: consensus.consensusLevel,
          totalVotes: consensus.totalVotes,
          participantCount: consensus.participantCount,
          leadingOption: consensus.leadingOption,
          timeToConsensus: consensus.timeToConsensus,
          velocity: consensus.velocity
        }
      })

      // Broadcast vote deleted
      // pollingWSManager.broadcastVoteDeleted(pollId, {
      //   pollId,
      //   userId: payload.userId,
      //   voteCount: consensus.totalVotes,
      //   consensusLevel: consensus.consensusLevel
      // })
    }

    return NextResponse.json({ message: 'Vote deleted successfully' })
  } catch (error) {
    console.error('Error deleting vote:', error)
    return NextResponse.json({ error: 'Failed to delete vote' }, { status: 500 })
  }
}

// Helper function to calculate consensus
function calculateConsensus(poll: any) {
  const totalVotes = poll.pollOptions.reduce((sum: number, option: any) => sum + option.votes.length, 0)
  const activeParticipants = poll.participants.filter((p: any) => p.status === 'VOTED').length
  
  if (totalVotes === 0) {
    return {
      consensusLevel: 0,
      totalVotes: 0,
      participantCount: activeParticipants,
      leadingOption: null,
      timeToConsensus: null,
      velocity: 0
    }
  }
  
  // Calculate vote distribution
  const optionBreakdown = poll.pollOptions.map((option: any) => ({
    optionId: option.id,
    text: option.text,
    voteCount: option.votes.length,
    percentage: (option.votes.length / totalVotes) * 100
  }))
  
  // Find leading option
  const leadingOption = optionBreakdown.reduce((max: any, current: any) => 
    current.voteCount > max.voteCount ? current : max
  )
  
  // Calculate consensus level based on configuration
  const consensusType = poll.consensusConfig?.consensusType || 'MAJORITY'
  let consensusLevel = 0
  
  switch (consensusType) {
    case 'PERCENTAGE':
      consensusLevel = leadingOption.percentage
      break
    case 'ABSOLUTE':
      consensusLevel = (leadingOption.voteCount / (poll.consensusConfig?.threshold || 1)) * 100
      break
    case 'MAJORITY':
      consensusLevel = leadingOption.percentage
      break
    case 'SUPERMAJORITY':
      consensusLevel = leadingOption.percentage
      break
    default:
      consensusLevel = leadingOption.percentage
  }
  
  // Calculate velocity (votes per minute in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentVotes = poll.pollOptions.flatMap((option: any) => 
    option.votes.filter((vote: any) => new Date(vote.createdAt) > oneHourAgo)
  )
  const velocity = recentVotes.length / 60 // votes per minute
  
  // Estimate time to consensus
  const threshold = poll.consensusConfig?.threshold || 50
  const timeToConsensus = velocity > 0 && consensusLevel < threshold 
    ? Math.max(0, Math.round((threshold - consensusLevel) / (velocity * 0.1)))
    : null
  
  return {
    consensusLevel,
    totalVotes,
    participantCount: activeParticipants,
    leadingOption: leadingOption.text,
    timeToConsensus,
    velocity,
    optionBreakdown
  }
}


