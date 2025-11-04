import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

interface SaveEventRequest {
  scrapedEventData: {
    title: string
    artist?: string
    venue: {
      name: string
      address: string
    }
    datetime: string
    price: {
      min?: number
      max?: number
      currency: string
      description: string
    }
    description: string
    imageUrl?: string
    ticketUrl: string
    ageRestriction?: string
    category?: string
    tags?: string[]
  }
  originalUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const clerkUser = await getClerkApiUser()
    if (!clerkUser) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'User not found'), { status: 401 })
    }

    const body: SaveEventRequest = await request.json()
    const { scrapedEventData, originalUrl } = body

    if (!scrapedEventData || !scrapedEventData.title) {
      return NextResponse.json(createErrorResponse('Invalid request', 'Scraped event data is required'), { status: 400 })
    }

    // Get or create user in our database
    let user = await db.user.findUnique({
      where: { clerkId: clerkUserId }
    })

    if (!user) {
      // Create user if they don't exist
      user = await db.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username || clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName || 'User'
        }
      })
    }

    // Parse the datetime
    const eventDateTime = new Date(scrapedEventData.datetime)
    const endDateTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000) // Add 2 hours as default end time

    // Create the event in the content table
    const event = await db.content.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'EVENT',
        title: scrapedEventData.title,
        description: scrapedEventData.description,
        image: scrapedEventData.imageUrl,
        location: scrapedEventData.venue.name,
        venue: scrapedEventData.venue.name,
        address: scrapedEventData.venue.address,
        startTime: eventDateTime,
        endTime: endDateTime,
        priceMin: scrapedEventData.price.min,
        priceMax: scrapedEventData.price.max,
        currency: scrapedEventData.price.currency,
        ticketUrl: scrapedEventData.ticketUrl,
        externalEventId: originalUrl,
        source: 'SCRAPED',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        isPublic: true, // Set isPublic for public scraped events
        creatorId: user.id,
        updatedAt: new Date()
      }
    })

    // Add event tags if provided
    if (scrapedEventData.tags && scrapedEventData.tags.length > 0) {
      await db.eventTag.createMany({
        data: scrapedEventData.tags.map(tag => ({
          contentId: event.id,
          tag: tag
        }))
      })
    }

    // Add category tag
    if (scrapedEventData.category) {
      await db.eventTag.create({
        data: {
          contentId: event.id,
          tag: scrapedEventData.category
        }
      })
    }

    // Add age restriction as a tag if provided
    if (scrapedEventData.ageRestriction) {
      await db.eventTag.create({
        data: {
          contentId: event.id,
          tag: `age_${scrapedEventData.ageRestriction}`
        }
      })
    }

    // Add artist as a tag if provided
    if (scrapedEventData.artist) {
      await db.eventTag.create({
        data: {
          contentId: event.id,
          tag: `artist_${scrapedEventData.artist}`
        }
      })
    }

    // Mark user as interested (create EventSave)
    await db.eventSave.create({
      data: {
        id: `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: event.id,
        userId: user.id
      }
    })

    return NextResponse.json(createSuccessResponse({
      eventId: event.id,
      title: event.title,
      message: 'Event saved successfully!'
    }, 'Event saved to your interests'))

  } catch (error) {
    logger.error('Error saving scraped event:', error)
    return NextResponse.json(createErrorResponse('Failed to save event', error.message), { status: 500 })
  }
}
