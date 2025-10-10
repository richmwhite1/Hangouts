import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { db } from '@/lib/db'
import { z } from 'zod'
import { checkAndFinalizeIfReady, calculateWinner } from '@/lib/hangout-flow'

const voteSchema = z.object({
  action: z.enum(['vote', 'toggle', 'preferred']),
  option: z.string()})

async function voteHandler(request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params
    const userId = request.user?.userId

    if (!userId) {
      return createErrorResponse('Authentication required', 'User ID not provided', 401)
    }

    const body = await request.json()
    const { action, option } = voteSchema.parse(body)

    // Check if content exists and is a hangout
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        type: true,
        privacyLevel: true,
        creatorId: true,
        content_participants: {
          select: {
            userId: true
          }
        },
        polls: {
          select: {
            id: true,
            status: true,
            options: true,
            consensusPercentage: true,
            expiresAt: true
          }
        }
      }
    })

    if (!content) {
      return createErrorResponse('Not found', 'Content not found', 404)
    }

    if (content.type !== 'HANGOUT') {
      return createErrorResponse('Bad request', 'Voting is only available for hangouts', 400)
    }

    // Check access permissions
    if (content.privacyLevel === 'PRIVATE') {
      const isParticipant = content.content_participants.some(p => p.userId === userId)
      const isCreator = content.creatorId === userId
      
      if (!isParticipant && !isCreator) {
        return createErrorResponse('Forbidden', 'Access denied', 403)
      }
    }

    // Check if there's an active poll
    const poll = content.polls[0]
    if (!poll) {
      return createErrorResponse('Bad request', 'No active poll found', 400)
    }

    if (poll.status !== 'ACTIVE') {
      return createErrorResponse('Bad request', 'Poll is not active', 400)
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date() > new Date(poll.expiresAt)) {
      return createErrorResponse('Bad request', 'Poll has expired', 400)
    }

    // Validate option exists
    const pollOptions = Array.isArray(poll.options) ? poll.options : []
    const optionExists = pollOptions.some((opt: any) => 
      typeof opt === 'string' ? opt === option : opt.id === option || opt.title === option
    )

    if (!optionExists) {
      return createErrorResponse('Bad request', 'Invalid option', 400)
    }

    // Handle different vote actions
    if (action === 'vote' || action === 'toggle') {
      // Check if user already voted for this option
      const existingVote = await db.pollVote.findUnique({
        where: {
          pollId_userId_option: {
            pollId: poll.id,
            userId: userId,
            option: option
          }
        }
      })

      if (existingVote) {
        // Toggle: remove the vote
        await db.pollVote.delete({
          where: {
            pollId_userId_option: {
              pollId: poll.id,
              userId: userId,
              option: option
            }
          }
        })

        return createSuccessResponse({
          voteCast: false,
          message: 'Vote removed'
        }, 'Vote removed successfully')
      } else {
        // Add the vote
        await db.pollVote.create({
          data: {
            pollId: poll.id,
            userId: userId,
            option: option,
            voteType: 'SINGLE',
            isPreferred: false
          }
        })

        return createSuccessResponse({
          voteCast: true,
          message: 'Vote cast successfully'
        }, 'Vote cast successfully')
      }
    } else if (action === 'preferred') {
      // Mark option as preferred (only one preferred per user per poll)
      // First, remove any existing preferred votes for this user
      await db.pollVote.updateMany({
        where: {
          pollId: poll.id,
          userId: userId,
          isPreferred: true
        },
        data: {
          isPreferred: false
        }
      })

      // Check if user already voted for this option
      const existingVote = await db.pollVote.findUnique({
        where: {
          pollId_userId_option: {
            pollId: poll.id,
            userId: userId,
            option: option
          }
        }
      })

      if (existingVote) {
        // Update existing vote to be preferred
        await db.pollVote.update({
          where: {
            pollId_userId_option: {
              pollId: poll.id,
              userId: userId,
              option: option
            }
          },
          data: {
            isPreferred: true
          }
        })
      } else {
        // Create new vote as preferred
        await db.pollVote.create({
          data: {
            pollId: poll.id,
            userId: userId,
            option: option,
            voteType: 'SINGLE',
            isPreferred: true
          }
        })
      }

      return createSuccessResponse({
        voteCast: true,
        preferred: true,
        message: 'Option marked as preferred'
      }, 'Option marked as preferred')
    }

    return createErrorResponse('Bad request', 'Invalid action', 400)
  } catch (error) {
    console.error('Error in voteHandler:', error)
    return createErrorResponse('Internal error', `Failed to process vote: ${error.message}`, 500)
  }
}

export const POST = createApiHandler(voteHandler, {
  requireAuth: true,
  enableRateLimit: true,
  enableCORS: true
})














