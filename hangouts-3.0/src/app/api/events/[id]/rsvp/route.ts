import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
const RSVPSchema = z.object({
  status: z.enum(['PENDING', 'YES', 'NO', 'MAYBE'])
})

// GET /api/events/[id]/rsvp - Get RSVP status for all participants
export async function GET(
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

    const { id: eventId } = await params

    // Get event
    const event = await db.content.findUnique({
      where: { id: eventId, type: 'EVENT' }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get RSVPs for this event
    const rsvps = await db.rsvp.findMany({
      where: { contentId: eventId },
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

    return NextResponse.json(createSuccessResponse(
      rsvps.map(rsvp => ({
        id: rsvp.id,
        eventId: eventId,
        userId: rsvp.userId,
        status: rsvp.status,
        respondedAt: rsvp.respondedAt,
        createdAt: rsvp.createdAt.toISOString(),
        updatedAt: rsvp.updatedAt.toISOString(),
        user: rsvp.users
      })),
      'RSVPs fetched successfully'
    ))

  } catch (error) {
    logger.error('❌ Error fetching RSVPs:', error);
    return NextResponse.json(createErrorResponse(
      'Failed to fetch RSVPs',
      error instanceof Error ? error.message : 'Unknown error'
    ), { status: 500 })
  }
}

// POST /api/events/[id]/rsvp - Update RSVP status
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

    const { id: eventId } = await params
    const body = await request.json()
    const validatedData = RSVPSchema.parse(body)

    // Get event
    const event = await db.content.findUnique({
      where: { id: eventId, type: 'EVENT' }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user is a participant, if not, add them as a participant
    let participant = await db.content_participants.findFirst({
      where: {
        contentId: eventId,
        userId: user.id}});

    if (!participant) {
      // Add user as a participant automatically
      participant = await db.content_participants.create({
        data: {
          id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: eventId,
          userId: user.id,
          role: 'MEMBER',
          canEdit: false,
          isMandatory: false,
          isCoHost: false,
          joinedAt: new Date()}});
    }

    // Check if RSVP already exists
    const existingRSVP = await db.rsvp.findFirst({
      where: { 
        contentId: eventId, 
        userId: user.id 
      }
    })

    let rsvp
    if (existingRSVP) {
      // Update existing RSVP
      rsvp = await db.rsvp.update({
        where: { id: existingRSVP.id },
        data: {
          status: validatedData.status,
          respondedAt: validatedData.status !== 'PENDING' ? new Date() : null
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
    } else {
      // Create new RSVP
      rsvp = await db.rsvp.create({
        data: {
          contentId: eventId,
          userId: user.id,
          status: validatedData.status,
          respondedAt: validatedData.status !== 'PENDING' ? new Date() : null
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
    }

    return NextResponse.json(createSuccessResponse({
      id: rsvp.id,
      eventId: eventId,
      userId: rsvp.userId,
      status: rsvp.status,
      respondedAt: rsvp.respondedAt,
      createdAt: rsvp.createdAt.toISOString(),
      updatedAt: rsvp.updatedAt.toISOString(),
      user: rsvp.users
    }, 'RSVP updated successfully'))

  } catch (error) {
    logger.error('❌ Error updating RSVP:', error);
    return NextResponse.json(createErrorResponse(
      'Failed to update RSVP',
      error instanceof Error ? error.message : 'Unknown error'
    ), { status: 500 })
  }
}
