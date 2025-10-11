import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { db } from '@/lib/db'
import { z } from 'zod'

import { logger } from '@/lib/logger'
const rsvpSchema = z.object({
  status: z.enum(['YES', 'NO', 'MAYBE'])})

async function updateRSVPHandler(request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params
    const userId = request.user?.userId

    if (!userId) {
      return createErrorResponse('Authentication required', 'User ID not provided', 401)
    }

    const body = await request.json()
    const { status } = rsvpSchema.parse(body)

    // Check if content exists and user has access
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
        }
      }
    })

    if (!content) {
      return createErrorResponse('Not found', 'Content not found', 404)
    }

    // Check access permissions
    if (content.privacyLevel === 'PRIVATE') {
      const isParticipant = content.content_participants.some(p => p.userId === userId)
      const isCreator = content.creatorId === userId
      
      if (!isParticipant && !isCreator) {
        return createErrorResponse('Forbidden', 'Access denied', 403)
      }
    }

    // Check if RSVP already exists
    const existingRSVP = await db.rsvp.findUnique({
      where: {
        contentId_userId: {
          contentId: contentId,
          userId: userId
        }
      }
    })

    if (existingRSVP) {
      // Update existing RSVP
      const updatedRSVP = await db.rsvp.update({
        where: {
          contentId_userId: {
            contentId: contentId,
            userId: userId
          }
        },
        data: {
          status: status,
          respondedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          }
        }
      })

      return createSuccessResponse({
        rsvp: {
          id: updatedRSVP.id,
          contentId: updatedRSVP.contentId,
          userId: updatedRSVP.userId,
          status: updatedRSVP.status,
          respondedAt: updatedRSVP.respondedAt?.toISOString(),
          createdAt: updatedRSVP.createdAt.toISOString(),
          updatedAt: updatedRSVP.updatedAt.toISOString(),
          user: updatedRSVP.users
        }
      }, 'RSVP updated successfully')
    } else {
      // Create new RSVP
      const newRSVP = await db.rsvp.create({
        data: {
          contentId: contentId,
          userId: userId,
          status: status,
          respondedAt: new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          }
        }
      })

      return createSuccessResponse({
        rsvp: {
          id: newRSVP.id,
          contentId: newRSVP.contentId,
          userId: newRSVP.userId,
          status: newRSVP.status,
          respondedAt: newRSVP.respondedAt?.toISOString(),
          createdAt: newRSVP.createdAt.toISOString(),
          updatedAt: newRSVP.updatedAt.toISOString(),
          user: newRSVP.users
        }
      }, 'RSVP created successfully')
    }
  } catch (error) {
    logger.error('Error in updateRSVPHandler:', error);
    return createErrorResponse('Internal error', `Failed to update RSVP: ${error.message}`, 500)
  }
}

export const POST = createApiHandler(updateRSVPHandler, {
  requireAuth: true,
  enableRateLimit: true,
  enableCORS: true
})














