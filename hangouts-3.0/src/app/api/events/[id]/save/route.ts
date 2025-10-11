import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
// POST /api/events/[id]/save - Save event to user's saved events
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

    // Get event
    const event = await db.content.findUnique({
      where: { id: eventId, type: 'EVENT' }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is already saved
    const existingSave = await db.eventSave.findFirst({
      where: { 
        contentId: eventId, 
        userId: user.id 
      }
    })

    if (existingSave) {
      return NextResponse.json(createSuccessResponse({
        message: 'Event already saved'
      }, 'Event already saved'))
    }

    // Save event
    const savedEvent = await db.eventSave.create({
      data: {
        contentId: eventId,
        userId: user.id
      }
    })

    return NextResponse.json(createSuccessResponse({
      id: savedEvent.id,
      contentId: eventId,
      userId: user.id,
      savedAt: savedEvent.createdAt.toISOString()
    }, 'Event saved successfully'))

  } catch (error) {
    logger.error('❌ Error saving event:', error);
    return NextResponse.json(createErrorResponse(
      'Failed to save event',
      error instanceof Error ? error.message : 'Unknown error'
    ), { status: 500 })
  }
}

// DELETE /api/events/[id]/save - Remove event from user's saved events
export async function DELETE(
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

    // Remove saved event
    await db.eventSave.deleteMany({
      where: { 
        contentId: eventId, 
        userId: user.id 
      }
    })

    return NextResponse.json(createSuccessResponse({
      message: 'Event removed from saved events'
    }, 'Event unsaved successfully'))

  } catch (error) {
    logger.error('❌ Error unsaving event:', error);
    return NextResponse.json(createErrorResponse(
      'Failed to unsave event',
      error instanceof Error ? error.message : 'Unknown error'
    ), { status: 500 })
  }
}

