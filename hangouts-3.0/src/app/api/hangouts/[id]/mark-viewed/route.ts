import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// POST /api/hangouts/[id]/mark-viewed - Mark a hangout as viewed by the current user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const { id: hangoutId } = await params

    // Check if user is a participant
    const participant = await db.content_participants.findFirst({
      where: {
        contentId: hangoutId,
        userId: user.id
      }
    })

    if (!participant) {
      return NextResponse.json(
        createErrorResponse('Not a participant', 'You must be a participant to view this hangout'),
        { status: 403 }
      )
    }

    // Update or create hangout view record
    const viewRecord = await db.hangoutView.upsert({
      where: {
        userId_hangoutId: {
          userId: user.id,
          hangoutId
        }
      },
      update: {
        lastViewedAt: new Date()
      },
      create: {
        userId: user.id,
        hangoutId,
        lastViewedAt: new Date()
      }
    })

    logger.info(`User ${user.id} viewed hangout ${hangoutId}`)

    return NextResponse.json(
      createSuccessResponse(
        { viewedAt: viewRecord.lastViewedAt },
        'Hangout marked as viewed'
      )
    )
  } catch (error) {
    logger.error('Error marking hangout as viewed:', error)
    return NextResponse.json(
      createErrorResponse('Failed to mark as viewed', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    )
  }
}

