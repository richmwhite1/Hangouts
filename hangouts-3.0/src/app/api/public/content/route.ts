import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.info('Public content API: Fetching public content', { search, type, limit, offset })

    // Build where clause for public content only
    const whereClause: any = {
      status: 'PUBLISHED',
      privacyLevel: 'PUBLIC'
    }

    // Add type filter
    if (type === 'hangouts' || type === 'HANGOUT') {
      whereClause.type = 'HANGOUT'
    } else if (type === 'events' || type === 'EVENT') {
      whereClause.type = 'EVENT'
    }
    // For 'all' and 'trending', don't filter by type

    // Add search filter
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Fetch hangouts with creator info
    const hangouts = await db.content.findMany({
      where: {
        ...whereClause,
        type: (type === 'events' || type === 'EVENT') ? undefined : 'HANGOUT'
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        image: true,
        privacyLevel: true,
        createdAt: true,
        creatorId: true,
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: {
            content_participants: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Fetch events with creator info
    const events = await db.content.findMany({
      where: {
        ...whereClause,
        type: (type === 'hangouts' || type === 'HANGOUT') ? undefined : 'EVENT'
      },
      select: {
        id: true,
        title: true,
        description: true,
        venue: true,
        city: true,
        startTime: true,
        endTime: true,
        image: true,
        priceMin: true,
        priceMax: true,
        createdAt: true,
        creatorId: true,
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: {
            content_participants: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Transform the data to match the expected format
    const transformedHangouts = hangouts.map(hangout => ({
      id: hangout.id,
      title: hangout.title,
      description: hangout.description,
      location: hangout.location,
      startTime: hangout.startTime,
      endTime: hangout.endTime,
      image: hangout.image,
      privacyLevel: hangout.privacyLevel,
      category: null,
      tags: [],
      creator: hangout.users || {
        name: 'Unknown',
        username: 'unknown',
        avatar: null
      },
      _count: {
        participants: hangout._count.content_participants
      }
    }))

    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      city: event.city,
      startTime: event.startTime,
      endTime: event.endTime,
      image: event.image,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      category: null,
      tags: [],
      creator: event.users || {
        name: 'Unknown',
        username: 'unknown',
        avatar: null
      },
      _count: {
        participants: event._count.content_participants
      }
    }))

    logger.info('Public content API: Successfully fetched content', { 
      hangoutsCount: transformedHangouts.length, 
      eventsCount: transformedEvents.length 
    })

    // Return content in the format expected by the discover page
    const allContent = [...transformedHangouts, ...transformedEvents]
    
    return NextResponse.json({
      success: true,
      content: allContent,
      hangouts: transformedHangouts,
      events: transformedEvents,
      total: allContent.length
    })

  } catch (error) {
    logger.error('Public content API: Error fetching content', error)
    console.error('Public content API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch public content',
      details: error instanceof Error ? error.message : 'Unknown error',
      hangouts: [],
      events: [],
      total: 0
    }, { status: 500 })
  }
}
