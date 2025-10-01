import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdatePollSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED', 'CANCELLED', 'CONSENSUS_REACHED']).optional(),
  allowMultiple: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
  allowDelegation: z.boolean().optional(),
  allowAbstention: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  expiresAt: z.string().datetime().optional()
})

// GET /api/polls/[pollId] - Get poll details
export async function GET(
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

    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        pollOptions: {
          include: { votes: true },
          orderBy: { order: 'asc' }
        },
        participants: {
          include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
        },
        consensusConfig: true,
        consensusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        users: { select: { id: true, username: true, name: true, avatar: true } },
        hangout_details: {
          select: { id: true, title: true, creatorId: true }
        }
      }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Check if user has access to this poll
    const hasAccess = poll.isPublic || 
                     poll.creatorId === session.user.id ||
                     poll.participants.some(p => p.userId === session.user.id) ||
                     poll.hangout_details.creatorId === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate consensus
    const totalVotes = poll.pollOptions.reduce((sum, option) => sum + option.votes.length, 0)
    const activeParticipants = poll.participants.filter(p => p.status === 'VOTED').length
    
    let consensusLevel = 0
    let leadingOption = null
    let optionBreakdown = []
    
    if (totalVotes > 0) {
      optionBreakdown = poll.pollOptions.map(option => ({
        optionId: option.id,
        text: option.text,
        description: option.description,
        voteCount: option.votes.length,
        percentage: (option.votes.length / totalVotes) * 100,
        votes: poll.isAnonymous ? [] : option.votes.map(vote => ({
          userId: vote.userId,
          voteType: vote.voteType,
          ranking: vote.ranking,
          score: vote.score,
          weight: vote.weight,
          sentiment: vote.sentiment,
          comment: vote.comment,
          createdAt: vote.createdAt
        }))
      }))
      
      const leading = optionBreakdown.reduce((max, current) => 
        current.voteCount > max.voteCount ? current : max
      )
      
      consensusLevel = leading.percentage
      leadingOption = leading.text
    }

    // Calculate velocity (votes per minute in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentVotes = poll.pollOptions.flatMap(option => 
      option.votes.filter(vote => new Date(vote.createdAt) > oneHourAgo)
    )
    const velocity = recentVotes.length / 60 // votes per minute

    // Estimate time to consensus
    const threshold = poll.consensusConfig?.threshold || 50
    const timeToConsensus = velocity > 0 && consensusLevel < threshold 
      ? Math.max(0, Math.round((threshold - consensusLevel) / (velocity * 0.1)))
      : null

    const pollWithConsensus = {
      ...poll,
      consensus: {
        level: consensusLevel,
        totalVotes,
        participantCount: activeParticipants,
        leadingOption,
        velocity,
        timeToConsensus,
        optionBreakdown,
        isConsensusReached: consensusLevel >= threshold,
        threshold
      }
    }

    return NextResponse.json(pollWithConsensus)
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 })
  }
}

// PUT /api/polls/[pollId] - Update poll
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
    const validatedData = UpdatePollSchema.parse(body)

    // Check if poll exists and user is creator
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: { creatorId: true, status: true }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to update this poll' }, { status: 403 })
    }

    // Prevent updating closed polls
    if (poll.status === 'CLOSED' || poll.status === 'CONSENSUS_REACHED') {
      return NextResponse.json({ error: 'Cannot update closed poll' }, { status: 400 })
    }

    // Update poll
    const updatedPoll = await db.poll.update({
      where: { id: pollId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        pollOptions: {
          include: { votes: true },
          orderBy: { order: 'asc' }
        },
        participants: {
          include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
        },
        consensusConfig: true,
        users: { select: { id: true, username: true, name: true, avatar: true } }
      }
    })

    // Broadcast update
    // pollingWSManager.broadcastPollUpdate(pollId, updatedPoll)

    return NextResponse.json(updatedPoll)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating poll:', error)
    return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 })
  }
}

// DELETE /api/polls/[pollId] - Delete poll
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

    // Check if poll exists and user is creator
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: { creatorId: true, status: true }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this poll' }, { status: 403 })
    }

    // Soft delete by updating status
    await db.poll.update({
      where: { id: pollId },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    // Broadcast poll closure
    // pollingWSManager.broadcastPollClosed(pollId, 'DELETED', null)

    return NextResponse.json({ message: 'Poll deleted successfully' })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
  }
}
