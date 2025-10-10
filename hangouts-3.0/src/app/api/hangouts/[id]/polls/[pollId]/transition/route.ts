import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

// Transition poll to RSVP mode
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
    const data = await request.json()
    const { action } = data // 'start', 'cancel', 'complete'

    // Get poll details
    const poll = await db.polls.findUnique({
      where: { id: pollId },
      include: {
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Check if user can manage this poll
    if (poll.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this poll' },
        { status: 403 }
      )
    }

    // Calculate poll results
    const totalVotes = poll.votes.length
    const optionVotes = poll.options.reduce((acc: any, option: any) => {
      const optionTitle = option.title || option
      acc[optionTitle] = poll.votes.filter(vote => vote.option === optionTitle).length
      return acc
    }, {} as Record<string, number>)

    const optionResults = poll.options.map((option: any) => {
      const optionTitle = option.title || option
      return {
        option: optionTitle,
        votes: optionVotes[optionTitle] || 0,
        percentage: totalVotes > 0 ? ((optionVotes[optionTitle] || 0) / totalVotes) * 100 : 0
      }
    })

    const winningOption = optionResults.reduce((max, option) => 
      option.votes > max.votes ? option : max, optionResults[0]
    )

    const consensusPercentage = winningOption.percentage
    const consensusThreshold = 60

    switch (action) {
      case 'start':
        // Check if consensus is reached
        if (consensusPercentage < consensusThreshold) {
          return NextResponse.json(
            { error: `Consensus not reached. Need ${consensusThreshold}% but only have ${consensusPercentage.toFixed(1)}%` },
            { status: 400 }
          )
        }

        // Update hangout with winning option
        await db.content.update({
          where: { id: hangoutId },
          data: {
            title: `${poll.title} - ${winningOption.option}`,
            description: poll.description || undefined,
            // Update other fields based on winning option if needed
          }
        })

        // Mark poll as transitioned
        await db.polls.update({
          where: { id: pollId },
          data: {
            expiresAt: new Date() // Effectively close the poll
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Poll successfully transitioned to RSVP mode',
          pollResult: {
            winningOption: winningOption.option,
            consensusPercentage,
            totalVotes,
            participantCount: totalVotes,
            timeToConsensus: 2.5 // Mock value
          }
        })

      case 'cancel':
        // Cancel any pending transition
        return NextResponse.json({
          success: true,
          message: 'Transition cancelled'
        })

      case 'complete':
        // Complete the transition
        return NextResponse.json({
          success: true,
          message: 'Transition completed successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be start, cancel, or complete' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error transitioning poll:', error)
    return NextResponse.json({ error: 'Failed to transition poll' }, { status: 500 })
  }
}

// Get transition status
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

    // Get poll details
    const poll = await db.polls.findUnique({
      where: { id: pollId },
      include: {
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Calculate poll results
    const totalVotes = poll.votes.length
    const optionVotes = poll.options.reduce((acc: any, option: any) => {
      const optionTitle = option.title || option
      acc[optionTitle] = poll.votes.filter(vote => vote.option === optionTitle).length
      return acc
    }, {} as Record<string, number>)

    const optionResults = poll.options.map((option: any) => {
      const optionTitle = option.title || option
      return {
        option: optionTitle,
        votes: optionVotes[optionTitle] || 0,
        percentage: totalVotes > 0 ? ((optionVotes[optionTitle] || 0) / totalVotes) * 100 : 0
      }
    })

    const winningOption = optionResults.reduce((max, option) => 
      option.votes > max.votes ? option : max, optionResults[0]
    )

    const consensusPercentage = winningOption.percentage
    const consensusThreshold = 60

    return NextResponse.json({
      pollResult: {
        winningOption: winningOption.option,
        consensusPercentage,
        totalVotes,
        participantCount: totalVotes,
        timeToConsensus: 2.5 // Mock value
      },
      transition: {
        isTransitioning: false,
        transitionProgress: 0,
        estimatedTimeRemaining: 5,
        autoTransitionAt: null
      }
    })
  } catch (error) {
    console.error('Error getting transition status:', error)
    return NextResponse.json({ error: 'Failed to get transition status' }, { status: 500 })
  }
}





