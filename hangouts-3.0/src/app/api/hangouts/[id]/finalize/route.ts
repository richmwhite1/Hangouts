import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { checkAndFinalizeIfReady, calculateWinner } from '@/lib/hangout-flow'
// POST /api/hangouts/[id]/finalize - Check and finalize hangout if ready
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const { id: hangoutId } = await params
    // Get hangout with all related data
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        hangout_details: {
          include: {
            polls: {
              include: {
                votes: true
              }
            }
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      }
    })
    if (!hangout || !hangout.hangout_details) {
      return NextResponse.json(createErrorResponse('Hangout not found', 'Hangout does not exist'), { status: 404 })
    }
    // Check if already finalized
    if (hangout.state === 'confirmed' || hangout.state === 'completed') {
      return NextResponse.json(createSuccessResponse({
        finalized: true,
        state: hangout.state,
        message: 'Hangout already finalized'
      }, 'Hangout already finalized'))
    }
    // Get votes from polls
    const votes = hangout.hangout_details.polls?.[0]?.votes?.reduce((acc, vote) => {
      acc[vote.userId] = vote.option
      return acc
    }, {} as Record<string, string>) || {}
    const hangoutWithVotes = {
      ...hangout,
      votes,
      participants: hangout.content_participants
    }
    // Check if ready to finalize
    if (checkAndFinalizeIfReady(hangoutWithVotes)) {
      // Calculate winner
      const winner = calculateWinner(hangoutWithVotes)
      if (!winner) {
        return NextResponse.json(createErrorResponse('No winner found', 'Cannot determine winning option'), { status: 400 })
      }
      // Update hangout state
      await db.content.update({
        where: { id: hangoutId },
        data: {
          state: 'confirmed',
          finalizedOption: winner
        }
      })
      // Update poll status
      if (hangout.hangout_details.polls?.[0]) {
        await db.polls.update({
          where: { id: hangout.hangout_details.polls[0].id },
          data: { status: 'CONSENSUS_REACHED' }
        })
      }
      // Notify participants (this would be implemented with a notification system)
      // notifyParticipants(hangoutId, 'PLAN_FINALIZED', winner)
      return NextResponse.json(createSuccessResponse({
        finalized: true,
        state: 'confirmed',
        winner,
        message: 'Hangout finalized successfully'
      }, 'Hangout finalized successfully!'))
    }
    return NextResponse.json(createSuccessResponse({
      finalized: false,
      state: hangout.state,
      message: 'Not ready to finalize yet'
    }, 'Not ready to finalize yet'))
  } catch (error) {
    console.error('Error finalizing hangout:', error)
    return NextResponse.json(createErrorResponse('Failed to finalize hangout', error.message), { status: 500 })
  }
}