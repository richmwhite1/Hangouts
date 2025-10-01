import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const CreatePollSchema = z.object({
  hangoutId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  options: z.array(z.object({
    text: z.string().min(1).max(100),
    description: z.string().max(200).optional()
  })).min(2).max(10),
  consensusConfig: z.object({
    consensusType: z.enum(['PERCENTAGE', 'ABSOLUTE', 'MAJORITY', 'SUPERMAJORITY', 'QUADRATIC', 'CONDORCET', 'CUSTOM']),
    threshold: z.number().min(0).max(100),
    minParticipants: z.number().min(1),
    timeLimit: z.number().min(1).optional(),
    allowTies: z.boolean().default(false),
    tieBreaker: z.string().optional(),
    customRules: z.record(z.any()).optional()
  }),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  allowDelegation: z.boolean().default(false),
  allowAbstention: z.boolean().default(true),
  allowAddOptions: z.boolean().default(true),
  isPublic: z.boolean().default(false),
  visibility: z.enum(['PRIVATE', 'FRIENDS', 'PUBLIC']).default('PRIVATE')
})

const UpdatePollSchema = CreatePollSchema.partial().omit({ hangoutId: true })

// GET /api/polls - List polls (supports both general and hangout-specific polls)
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
    const hangoutId = searchParams.get('hangoutId')
    const contentId = searchParams.get('contentId') // Support content-based hangout lookup
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const where: any = {}
    
    // Handle both direct hangoutId and contentId lookup
    if (hangoutId) {
      where.hangoutId = hangoutId
    } else if (contentId) {
      // Look up hangout details ID from content ID
      const hangout = await db.content.findUnique({
        where: { id: contentId },
        include: { hangout_details: true }
      })
      if (hangout?.hangout_details) {
        where.hangoutId = hangout.hangout_details.id
      } else {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No polls found for this hangout'
        })
      }
    }
    
    if (status) where.status = status

    const [polls, total] = await Promise.all([
      db.polls.findMany({
        where,
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
            take: 1
          },
          users: { select: { id: true, username: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.polls.count({ where })
    ])

    // Calculate consensus for each poll
    const pollsWithConsensus = polls.map(poll => {
      const totalVotes = poll.pollOptions.reduce((sum, option) => sum + option.votes.length, 0)
      const activeParticipants = poll.participants.filter(p => p.status === 'VOTED').length
      
      let consensusLevel = 0
      let leadingOption = null
      
      if (totalVotes > 0) {
        const optionBreakdown = poll.pollOptions.map(option => ({
          optionId: option.id,
          text: option.text,
          voteCount: option.votes.length,
          percentage: (option.votes.length / totalVotes) * 100
        }))
        
        const leading = optionBreakdown.reduce((max, current) => 
          current.voteCount > max.voteCount ? current : max
        )
        
        consensusLevel = leading.percentage
        leadingOption = leading.text
      }

      return {
        ...poll,
        consensus: {
          level: consensusLevel,
          totalVotes,
          participantCount: activeParticipants,
          leadingOption,
          velocity: poll.consensusHistory[0]?.velocity || 0,
          timeToConsensus: poll.consensusHistory[0]?.timeToConsensus || null
        }
      }
    })

    return NextResponse.json({
      polls: pollsWithConsensus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }
}

// POST /api/polls - Create poll (supports both general and hangout-specific polls)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    
    // Handle both hangoutId and contentId for poll creation
    let hangoutId = body.hangoutId
    if (body.contentId && !hangoutId) {
      const hangout = await db.content.findUnique({
        where: { id: body.contentId },
        include: { hangout_details: true }
      })
      if (hangout?.hangout_details) {
        hangoutId = hangout.hangout_details.id
      } else {
        return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
      }
    }
    
    const validatedData = CreatePollSchema.parse({ ...body, hangoutId })

    // Check if user has permission to create polls in this hangout
    const hangout = await db.hangout_details.findUnique({
      where: { id: validatedData.hangoutId },
      include: { participants: true }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    // Check if user is participant or creator
    const isParticipant = hangout.participants.some(p => p.userId === payload.userId)
    const isCreator = hangout.creatorId === payload.userId

    if (!isParticipant && !isCreator) {
      return NextResponse.json({ error: 'Not authorized to create polls in this hangout' }, { status: 403 })
    }

    // Create poll with transaction
    const result = await db.$transaction(async (tx) => {
      // Create poll
      const poll = await tx.polls.create({
        data: {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          hangoutId: validatedData.hangoutId,
          creatorId: payload.userId,
          title: validatedData.title,
          description: validatedData.description,
          options: validatedData.options.map(opt => opt.text), // Keep old format for compatibility
          allowMultiple: validatedData.allowMultiple,
          isAnonymous: validatedData.isAnonymous,
          status: 'DRAFT',
        allowDelegation: validatedData.allowDelegation,
        allowAbstention: validatedData.allowAbstention,
        allowAddOptions: validatedData.allowAddOptions,
        isPublic: validatedData.isPublic,
        visibility: validatedData.visibility,
          consensusPercentage: validatedData.consensusConfig.threshold,
          minimumParticipants: validatedData.consensusConfig.minParticipants,
          consensusType: validatedData.consensusConfig.consensusType.toLowerCase()
        }
      })

      // Create poll options
      const pollOptions = await Promise.all(
        validatedData.options.map((option, index) =>
          tx.PollOption.create({
            data: {
              pollId: poll.id,
              text: option.text,
              description: option.description,
              order: index
            }
          })
        )
      )

      // Create consensus config
      const consensusConfig = await tx.ConsensusConfig.create({
        data: {
          pollId: poll.id,
          consensusType: validatedData.consensusConfig.consensusType,
          threshold: validatedData.consensusConfig.threshold,
          minParticipants: validatedData.consensusConfig.minParticipants,
          timeLimit: validatedData.consensusConfig.timeLimit,
          allowTies: validatedData.consensusConfig.allowTies,
          tieBreaker: validatedData.consensusConfig.tieBreaker,
          customRules: validatedData.consensusConfig.customRules
        }
      })

      // Create participants for all hangout participants and the creator
      const allParticipants = [
        ...hangout.participants,
        { userId: payload.userId } // Add creator as participant
      ]
      
      // Remove duplicates
      const uniqueParticipants = allParticipants.filter((participant, index, self) => 
        index === self.findIndex(p => p.userId === participant.userId)
      )
      
      const participants = await Promise.all(
        uniqueParticipants.map(participant =>
          tx.PollParticipant.create({
            data: {
              pollId: poll.id,
              userId: participant.userId,
              status: participant.userId === payload.userId ? 'ACTIVE' : 'INVITED',
              canVote: true,
              canDelegate: validatedData.allowDelegation
            }
          })
        )
      )

      return { poll, pollOptions, consensusConfig, participants }
    })

    // Broadcast poll creation
    // Note: This would be handled by the WebSocket server in a real implementation
    // pollingWSManager.broadcastPollCreated(result.poll, result.participants)

    return NextResponse.json({
      poll: result.poll,
      options: result.pollOptions,
      consensusConfig: result.consensusConfig,
      participants: result.participants
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating poll:', error)
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}
