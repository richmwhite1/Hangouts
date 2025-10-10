import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

// POST /api/events/[id]/save - Save event to user's saved events
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        userId: userId 
      }
    })

    if (existingSave) {
    return NextResponse.json({
      success: true,
      message: 'Event already saved'
    })
    }

    // Save event
    const savedEvent = await db.eventSave.create({
      data: {
        contentId: eventId,
        userId: userId
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: savedEvent.id,
        contentId: eventId,
        userId: userId,
        savedAt: savedEvent.createdAt.toISOString()
      },
      message: 'Event saved successfully'
    })

  } catch (error) {
    console.error('❌ Error saving event:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save event',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/events/[id]/save - Remove event from user's saved events
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Remove saved event
    await db.eventSave.deleteMany({
      where: { 
        contentId: eventId, 
        userId: userId 
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Event removed from saved events'
    })

  } catch (error) {
    console.error('❌ Error unsaving event:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to unsave event',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

