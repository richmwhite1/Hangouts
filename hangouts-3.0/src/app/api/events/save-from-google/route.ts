import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Save a Google search event to the user's saved events
 * POST /api/events/save-from-google
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      venue,
      address,
      city,
      startDate,
      startTime,
      endDate,
      endTime,
      coverImage,
      sourceUrl,
      price,
      tags
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Parse dates
    let startDateTime: Date
    if (startDate && startTime) {
      startDateTime = new Date(`${startDate}T${startTime}`)
    } else if (startDate) {
      startDateTime = new Date(startDate)
    } else {
      startDateTime = new Date() // Default to now
    }

    let endDateTime: Date | null = null
    if (endDate && endTime) {
      endDateTime = new Date(`${endDate}T${endTime}`)
    } else if (endDate) {
      endDateTime = new Date(endDate)
    } else if (startDateTime) {
      // Default to 2 hours after start
      endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000)
    }

    // Create the event in the content table
    const event = await db.content.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'EVENT',
        title: title,
        description: description || '',
        image: coverImage || null,
        location: venue || address || city || '',
        venue: venue || '',
        address: address || '',
        city: city || '',
        latitude: null, // Could be enhanced with geocoding
        longitude: null,
        startTime: startDateTime,
        endTime: endDateTime,
        priceMin: price?.min || 0,
        priceMax: price?.max || null,
        currency: price?.currency || 'USD',
        ticketUrl: sourceUrl || null,
        externalEventId: sourceUrl || null,
        source: 'OTHER', // EventSource enum doesn't have GOOGLE_SEARCH, use OTHER
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date()
      }
    })

    // Add event tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      // Note: Assuming eventTag model exists, adjust if needed
      try {
        await db.eventTag.createMany({
          data: tags.map((tag: string) => ({
            contentId: event.id,
            tag: tag
          })),
          skipDuplicates: true
        })
      } catch (tagError) {
        logger.warn('Could not create event tags:', tagError)
        // Continue even if tags fail
      }
    }

    // Mark user as interested (create EventSave)
    try {
      await db.eventSave.create({
        data: {
          contentId: event.id,
          userId: user.id
        }
      })
    } catch (saveError: any) {
      // If already saved, that's okay
      if (saveError?.code !== 'P2002') {
        logger.warn('Could not mark event as saved:', saveError)
      }
    }

    logger.info('Google event saved:', { eventId: event.id, userId: user.id })

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        venue: event.venue,
        address: event.address,
        city: event.city,
        startDate: event.startTime?.toISOString(),
        endDate: event.endTime?.toISOString(),
        coverImage: event.image,
        createdAt: event.createdAt.toISOString()
      }
    })

  } catch (error: any) {
    logger.error('Error saving Google event:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save event',
        details: process.env.NODE_ENV === 'development'
          ? (error?.message || 'Unknown error')
          : undefined
      },
      { status: 500 }
    )
  }
}


