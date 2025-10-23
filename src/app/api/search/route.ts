import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        success: true, 
        results: { hangouts: [], events: [] } 
      })
    }

    const searchTerm = query.trim().toLowerCase()

    // Search hangouts
    const hangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { location: { contains: searchTerm, mode: 'insensitive' } }
        ],
        OR: [
          { privacyLevel: 'PUBLIC' },
          {
            AND: [
              { privacyLevel: 'FRIENDS_ONLY' },
              {
                content_participants: {
                  some: { userId: user.id }
                }
              }
            ]
          },
          {
            AND: [
              { privacyLevel: 'PRIVATE' },
              { creatorId: user.id }
            ]
          }
        ]
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
        creatorId: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Search events (if you have an events table)
    const events = await db.content.findMany({
      where: {
        type: 'EVENT',
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { location: { contains: searchTerm, mode: 'insensitive' } }
        ],
        OR: [
          { privacyLevel: 'PUBLIC' },
          {
            AND: [
              { privacyLevel: 'FRIENDS_ONLY' },
              {
                content_participants: {
                  some: { userId: user.id }
                }
              }
            ]
          },
          {
            AND: [
              { privacyLevel: 'PRIVATE' },
              { creatorId: user.id }
            ]
          }
        ]
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
        creatorId: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Transform results
    const transformedHangouts = hangouts.map(hangout => ({
      id: hangout.id,
      type: 'hangout',
      title: hangout.title,
      description: hangout.description,
      location: hangout.location,
      startTime: hangout.startTime?.toISOString(),
      endTime: hangout.endTime?.toISOString(),
      image: hangout.image,
      privacyLevel: hangout.privacyLevel,
      creator: hangout.users,
      participants: hangout._count.content_participants,
      comments: hangout._count.comments,
      likes: hangout._count.content_likes,
      shares: hangout._count.content_shares,
      messages: hangout._count.messages
    }))

    const transformedEvents = events.map(event => ({
      id: event.id,
      type: 'event',
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime?.toISOString(),
      endTime: event.endTime?.toISOString(),
      image: event.image,
      privacyLevel: event.privacyLevel,
      creator: event.users,
      participants: event._count.content_participants,
      comments: event._count.comments,
      likes: event._count.content_likes,
      shares: event._count.content_shares,
      messages: event._count.messages
    }))

    logger.info(`Search completed for query: "${query}" - Found ${transformedHangouts.length} hangouts and ${transformedEvents.length} events`)

    return NextResponse.json({
      success: true,
      results: {
        hangouts: transformedHangouts,
        events: transformedEvents,
        total: transformedHangouts.length + transformedEvents.length
      }
    })

  } catch (error) {
    logger.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}








