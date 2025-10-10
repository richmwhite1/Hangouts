import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

// POST /api/hangouts/[id]/finalize-plan - Finalize plan when consensus is reached
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: hangoutId } = await params

    // Get hangout details
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        hangout_details: true
      }
    })

    if (!hangout || !hangout.hangout_details) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    const hangoutDetailsId = hangout.hangout_details.id

    // Get the poll with consensus reached
    const poll = await db.polls.findFirst({
      where: { 
        hangoutId: hangoutDetailsId,
        status: 'ACTIVE'
      },
      include: {
        pollOptions: {
          include: {
            votes: true
          }
        },
        participants: true,
        consensusConfig: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!poll) {
      return NextResponse.json({ error: 'No active poll found' }, { status: 404 })
    }

    // Calculate consensus
    const totalVotes = poll.pollOptions.reduce((sum, option) => sum + option.votes.length, 0)
    const minParticipants = poll.consensusConfig?.minParticipants || 2
    const threshold = poll.consensusConfig?.threshold || 50

    if (totalVotes < minParticipants) {
      return NextResponse.json({ error: 'Not enough participants have voted' }, { status: 400 })
    }

    // Find the winning option
    const winningOption = poll.pollOptions.reduce((max, current) => 
      current.votes.length > max.votes.length ? current : max
    )

    const consensusLevel = totalVotes > 0 ? (winningOption.votes.length / totalVotes) * 100 : 0

    if (consensusLevel < threshold) {
      return NextResponse.json({ error: 'Consensus threshold not reached' }, { status: 400 })
    }

    // Use transaction to finalize the plan
    const result = await db.$transaction(async (tx) => {
      // Update poll status to COMPLETED
      await tx.polls.update({
        where: { id: poll.id },
        data: { status: 'COMPLETED' }
      })

      // Create final plan record
      const finalPlan = await tx.finalPlan.create({
        data: {
          hangoutId: hangoutDetailsId,
          pollId: poll.id,
          title: poll.title,
          description: poll.description,
          optionId: winningOption.id,
          optionText: winningOption.text,
          optionDescription: winningOption.description,
          metadata: winningOption.metadata,
          consensusLevel,
          totalVotes,
          finalizedBy: user.id,
          finalizedAt: new Date()
        }
      })

      // Create RSVP records for all participants
      const rsvpRecords = await Promise.all(
        poll.participants.map(participant =>
          tx.rsvp.create({
            data: {
              hangoutId: hangoutDetailsId,
              userId: participant.userId,
              status: 'PENDING',
              respondedAt: null,
              createdAt: new Date()
            }
          })
        )
      )

      return {
        finalPlan,
        rsvpRecords,
        winningOption: {
          id: winningOption.id,
          text: winningOption.text,
          description: winningOption.description,
          metadata: winningOption.metadata
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Plan finalized successfully',
      finalPlan: result.finalPlan,
      winningOption: result.winningOption,
      rsvpCount: result.rsvpRecords.length
    })

  } catch (error) {
    console.error('❌ Error finalizing plan:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to finalize plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
