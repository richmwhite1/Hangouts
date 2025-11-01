import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { 
  generateRRule, 
  parseRRule, 
  generateEventInstances, 
  validateRecurrencePattern,
  type RecurrencePattern 
} from '@/lib/recurrence-utils'

/**
 * POST /api/events/recurring
 * Create a recurring event series
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { eventData, recurrencePattern } = body

    // Validate recurrence pattern
    const validation = validateRecurrencePattern(recurrencePattern)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      )
    }

    // Generate RRULE
    const rrule = generateRRule(recurrencePattern)

    // Create parent event
    const parentEvent = await db.content.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'EVENT',
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        venue: eventData.venue,
        address: eventData.address,
        city: eventData.city,
        state: eventData.state,
        zipCode: eventData.zipCode,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        startTime: new Date(eventData.startTime),
        endTime: eventData.endTime ? new Date(eventData.endTime) : null,
        priceMin: eventData.priceMin,
        priceMax: eventData.priceMax,
        currency: eventData.currency || 'USD',
        image: eventData.image,
        privacyLevel: eventData.privacyLevel || 'PUBLIC',
        isPublic: eventData.isPublic ?? true,
        status: 'PUBLISHED',
        creatorId: user.id,
        isRecurring: true,
        recurrenceRule: rrule,
        recurrenceEndDate: recurrencePattern.endDate,
        updatedAt: new Date()
      }
    })

    // Generate event instances (up to 50 or 6 months)
    const startDate = new Date(eventData.startTime)
    const instances = generateEventInstances(startDate, recurrencePattern, 50)

    // Create instance events (skip first one as it's the parent)
    const instancePromises = instances.slice(1).map(async (instanceDate) => {
      const instanceStartTime = new Date(instanceDate)
      const instanceEndTime = eventData.endTime 
        ? new Date(instanceDate.getTime() + (new Date(eventData.endTime).getTime() - startDate.getTime()))
        : null

      return db.content.create({
        data: {
          id: `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          type: 'EVENT',
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          venue: eventData.venue,
          address: eventData.address,
          city: eventData.city,
          state: eventData.state,
          zipCode: eventData.zipCode,
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          startTime: instanceStartTime,
          endTime: instanceEndTime,
          priceMin: eventData.priceMin,
          priceMax: eventData.priceMax,
          currency: eventData.currency || 'USD',
          image: eventData.image,
          privacyLevel: eventData.privacyLevel || 'PUBLIC',
          isPublic: eventData.isPublic ?? true,
          status: 'PUBLISHED',
          creatorId: user.id,
          isRecurring: false,
          parentEventId: parentEvent.id,
          updatedAt: new Date()
        }
      })
    })

    await Promise.all(instancePromises)

    return NextResponse.json({
      success: true,
      message: 'Recurring event series created',
      parentEvent: {
        id: parentEvent.id,
        title: parentEvent.title,
        recurrenceRule: rrule,
        instanceCount: instances.length
      }
    })
  } catch (error) {
    console.error('Error creating recurring event:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create recurring event' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/events/recurring/:parentId
 * Get all instances of a recurring event series
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (!parentId) {
      return NextResponse.json(
        { success: false, message: 'Parent event ID is required' },
        { status: 400 }
      )
    }

    // Get parent event
    const parentEvent = await db.content.findUnique({
      where: { id: parentId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    if (!parentEvent) {
      return NextResponse.json(
        { success: false, message: 'Parent event not found' },
        { status: 404 }
      )
    }

    if (!parentEvent.isRecurring) {
      return NextResponse.json(
        { success: false, message: 'Event is not recurring' },
        { status: 400 }
      )
    }

    // Get all instances
    const instances = await db.content.findMany({
      where: {
        OR: [
          { id: parentId },
          { parentEventId: parentId }
        ]
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        rsvps: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // Parse recurrence pattern
    const recurrencePattern = parentEvent.recurrenceRule 
      ? parseRRule(parentEvent.recurrenceRule)
      : null

    return NextResponse.json({
      success: true,
      parentEvent: {
        id: parentEvent.id,
        title: parentEvent.title,
        description: parentEvent.description,
        recurrenceRule: parentEvent.recurrenceRule,
        recurrencePattern,
        creator: parentEvent.users
      },
      instances: instances.map(instance => ({
        id: instance.id,
        title: instance.title,
        startTime: instance.startTime,
        endTime: instance.endTime,
        location: instance.location,
        venue: instance.venue,
        rsvpCount: instance.rsvps?.length || 0,
        isParent: instance.id === parentId
      }))
    })
  } catch (error) {
    console.error('Error fetching recurring event series:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recurring event series' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/recurring/:parentId
 * Delete a recurring event series (all instances)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const deleteType = searchParams.get('type') || 'all' // 'all' or 'future'

    if (!parentId) {
      return NextResponse.json(
        { success: false, message: 'Parent event ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const parentEvent = await db.content.findUnique({
      where: { id: parentId },
      select: { creatorId: true, isRecurring: true }
    })

    if (!parentEvent) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      )
    }

    if (parentEvent.creatorId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to delete this event' },
        { status: 403 }
      )
    }

    if (deleteType === 'all') {
      // Delete parent and all instances
      await db.content.deleteMany({
        where: {
          OR: [
            { id: parentId },
            { parentEventId: parentId }
          ]
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Recurring event series deleted'
      })
    } else if (deleteType === 'future') {
      // Delete only future instances
      const now = new Date()
      await db.content.deleteMany({
        where: {
          parentEventId: parentId,
          startTime: { gte: now }
        }
      })

      // Update parent to mark series as ended
      await db.content.update({
        where: { id: parentId },
        data: {
          recurrenceEndDate: now
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Future occurrences deleted'
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid delete type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error deleting recurring event:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete recurring event' },
      { status: 500 }
    )
  }
}

