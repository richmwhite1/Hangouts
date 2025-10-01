import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// POST /api/events/[id]/save - Save event to user's saved events
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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
        userId: payload.userId 
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
        userId: payload.userId
      }
    })

    return NextResponse.json(createSuccessResponse({
      id: savedEvent.id,
      contentId: eventId,
      userId: payload.userId,
      savedAt: savedEvent.createdAt.toISOString()
    }, 'Event saved successfully'))

  } catch (error) {
    console.error('❌ Error saving event:', error)
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Remove saved event
    await db.eventSave.deleteMany({
      where: { 
        contentId: eventId, 
        userId: payload.userId 
      }
    })

    return NextResponse.json(createSuccessResponse({
      message: 'Event removed from saved events'
    }, 'Event unsaved successfully'))

  } catch (error) {
    console.error('❌ Error unsaving event:', error)
    return NextResponse.json(createErrorResponse(
      'Failed to unsave event',
      error instanceof Error ? error.message : 'Unknown error'
    ), { status: 500 })
  }
}

