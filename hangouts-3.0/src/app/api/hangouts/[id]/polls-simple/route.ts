import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// GET /api/hangouts/[id]/polls-simple - Get polls for a specific hangout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params
    
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // First, get the hangout to find the hangout_details ID
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        hangout_details: true
      }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    if (!hangout.hangout_details) {
      return NextResponse.json({ error: 'Hangout details not found' }, { status: 404 })
    }

    const hangoutDetailsId = hangout.hangout_details.id

    // Get all polls for this hangout
    const polls = await db.polls.findMany({
      where: { 
        hangoutId: hangoutDetailsId
      },
      include: {
        pollOptions: {
          orderBy: { order: 'asc' }
        },
        participants: {
          include: {
            user: { select: { id: true, username: true, name: true, avatar: true } }
          }
        },
        votes: {
          include: {
            user: { select: { id: true, username: true, name: true, avatar: true } }
          }
        },
        consensusConfig: true
      },
      orderBy: { createdAt: 'desc' }
    })


    // Auto-add current user as participant to all polls if they're not already one
    for (const poll of polls) {
      const isParticipant = poll.participants.some(p => p.userId === user.id)
      if (!isParticipant) {
        await db.pollParticipant.create({
          data: {
            pollId: poll.id,
            userId: user.id,
            status: 'ACTIVE',
            canVote: true,
            canDelegate: false
          }
        })
      }
    }

    // Transform polls to match the expected format
    const transformedPolls = polls.map(poll => {
      
      // Calculate vote counts for each option
      const optionVoteCounts = new Map()
      const totalVotes = poll.votes.length
      
      // Count votes per option
      poll.votes.forEach(vote => {
        const optionId = vote.optionId
        if (!optionVoteCounts.has(optionId)) {
          optionVoteCounts.set(optionId, [])
        }
        optionVoteCounts.get(optionId).push({
          userId: vote.userId,
          user: vote.user
        })
      })

      // Transform options with actual vote counts
      const options = poll.pollOptions.map(option => {
        const votes = optionVoteCounts.get(option.id) || []
        const voteCount = votes.length
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
        
        // Extract metadata for what, where, when
        const metadata = option.metadata as any || {}
        
        return {
          id: option.id,
          text: option.text,
          description: option.description,
          order: option.order,
          metadata: option.metadata,
          what: metadata.what || option.text,
          where: metadata.where || metadata.location || '',
          when: metadata.when || (metadata.date && metadata.time ? `${metadata.date} at ${metadata.time}` : 
                metadata.date || metadata.time || ''),
          voteCount,
          percentage,
          votes
        }
      })

      // Find leading option
      const leadingOption = options.reduce((max, current) => 
        current.voteCount > max.voteCount ? current : max
      )

      // Calculate consensus level (percentage of votes for leading option)
      const consensusLevel = totalVotes > 0 ? leadingOption.percentage : 0
      
      // Get consensus configuration
      const consensusConfig = poll.consensusConfig
      const minParticipants = consensusConfig?.minParticipants || 2
      const threshold = consensusConfig?.threshold || 50
      
      // Consensus is reached when:
      // 1. We have enough participants who voted (at least minParticipants)
      // 2. The leading option has at least the threshold percentage of votes
      const consensusReached = totalVotes >= minParticipants && consensusLevel >= threshold

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        pollOptions: options,
        options: options, // Keep both for compatibility
        totalVotes,
        consensusReached,
        consensusLevel,
        participantCount: poll.participants.length,
        participants: poll.participants.map(p => ({
          userId: p.userId,
          status: p.status,
          user: p.user
        })),
        creator: {
          id: poll.creatorId,
          username: 'creator', // We'll need to fetch this separately if needed
          name: 'Creator',
          avatar: null
        },
        allowAddOptions: poll.allowAddOptions,
        visibility: poll.visibility,
        consensusConfig: poll.consensusConfig,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt
      }
    })


    return NextResponse.json({
      success: true,
      polls: transformedPolls
    })
  } catch (error) {
    logger.error('❌ Error fetching hangout polls:', error);
    logger.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }
}