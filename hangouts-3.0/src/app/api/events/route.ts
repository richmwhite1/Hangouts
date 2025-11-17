import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createStartTimeFilter } from '@/lib/date-utils'

import { logger } from '@/lib/logger'
// GET /api/events - List events
export async function GET(request: NextRequest) {
  try {
    // console.log('🔍 Events API: GET request received'); // Removed for production
    
    // Handle query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const includePast = searchParams.get('includePast') === 'true'
    
    // console.log('🔍 Query params:', { search, category, dateFrom, dateTo }); // Removed for production
    // console.log('🔍 Available db models:', Object.keys(db); // Removed for production)
    
    // Get user ID for friend context (optional for discover page)
    let userId: string | null = null
    try {
      const { userId: clerkUserId } = await auth()
      if (clerkUserId) {
        const user = await getClerkApiUser()
        if (user) {
          userId = user.id
        }
      }
    } catch (error) {
      // console.log('Events API: No authenticated user, showing public events'); // Removed for production
    }

    let friendIds: string[] = []
    
    // If user is authenticated, get their friends for FRIENDS_ONLY events
    if (userId) {
      const userFriends = await db.friendship.findMany({
        where: {
          OR: [
            { userId: userId },
            { friendId: userId }
          ]
        },
        select: {
          userId: true,
          friendId: true
        }
      })

      friendIds = userFriends.map(friend => 
        friend.userId === userId ? friend.friendId : friend.userId
      )
    }

    // Build where clause with privacy logic: PUBLIC events + user's own events + FRIENDS_ONLY events from user's friends
    const privacyOr: any[] = [
      // Public events (everyone can see)
      { privacyLevel: 'PUBLIC' },
      // User's own events (if authenticated)
      ...(userId ? [{ creatorId: userId }] : []),
      // Friends-only events from user's friends (if authenticated)
      ...(userId && friendIds.length > 0 ? [{
        AND: [
          { privacyLevel: 'FRIENDS_ONLY' },
          { creatorId: { in: friendIds } }
        ]
      }] : [])
    ]

    const whereClause: any = {
      type: 'EVENT',
      AND: [
        {
          OR: privacyOr
        }
      ]
    }
    
    if (search) {
      whereClause.AND.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { location: { contains: search } }
        ]
      })
    }
    
    if (category) {
      whereClause.AND.push({ category })
    }
    
    const startTimeFilter = createStartTimeFilter({
      startDate: startDateParam || dateFrom,
      endDate: endDateParam || dateTo,
      includePast
    })
    
    // When includePast is false, show events that haven't ended yet
    // This means: startTime >= now OR (endTime >= now OR endTime is null)
    if (!includePast && !startDateParam && !dateFrom) {
      const now = new Date()
      // Add date filter: show events that either start in the future OR haven't ended yet
      whereClause.AND.push({
        OR: [
          { startTime: { gte: now } },
          {
            OR: [
              { endTime: { gte: now } },
              { endTime: null }
            ]
          }
        ]
      })
    } else if (startTimeFilter) {
      whereClause.AND.push({ startTime: startTimeFilter })
    }
    
    const events = await db.content.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 50 // Increased limit for better results
    })

    logger.info(`Events API: Found ${events.length} events for user ${userId || 'anonymous'}`)

    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      category: 'OTHER', // Default category since we don't have categories in unified table
      venue: event.venue || event.location || '',
      address: event.address || event.location || '',
      city: event.city || event.location || '',
      startDate: event.startTime ? new Date(event.startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '12:00 PM',
      endDate: event.endTime ? new Date(event.endTime).toISOString().split('T')[0] : undefined,
      endTime: event.endTime ? new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : undefined,
      coverImage: event.image || '/placeholder-event.jpg',
      price: {
        min: event.priceMin || 0,
        max: event.priceMax || 0,
        currency: 'USD'
      },
      tags: [], // No tags in unified table for now
      attendeeCount: 0, // Default count - could fetch from content_participants if needed
      isPublic: event.privacyLevel === 'PUBLIC',
      creator: event.users || { name: 'Unknown', username: 'unknown', avatar: null },
      createdAt: event.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      events: transformedEvents
    })

  } catch (error) {
    logger.error('Events API Error:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
      logger.error('Error stack:', error.stack);
    }
    
    // Return empty array instead of error to prevent UI from breaking
    // Log the error for debugging but allow the page to render
    return NextResponse.json(
      { 
        success: true, 
        events: [],
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 200 } // Return 200 with empty array instead of 500
    )
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    // console.log('🔍 Events API: POST request received'); // Removed for production
    
    const body = await request.json()
    // console.log('📊 Request body:', JSON.stringify(body, null, 2); // Removed for production)

    // Get user ID from Clerk auth
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the actual user from database
    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const isPublic = body.isPublic !== false
    const event = await db.content.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'EVENT',
        title: body.title || 'Untitled Event',
        description: body.description || '',
        image: body.coverImage || null,
        location: body.venue || body.location || '',
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        startTime: body.startDate ? new Date(body.startDate) : new Date(),
        endTime: body.endDate ? new Date(body.endDate) : null,
        privacyLevel: isPublic ? 'PUBLIC' : 'PRIVATE',
        creatorId: user.id,
        updatedAt: new Date()
      }
    })

    // console.log('✅ Event created:', event.id); // Removed for production

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        venue: event.location,
        address: event.location,
        city: event.location,
        startDate: event.startTime?.toISOString(),
        endDate: event.endTime?.toISOString(),
        coverImage: event.image,
        createdAt: event.createdAt.toISOString()
      }
    })

  } catch (error) {
    logger.error('Events API Error (POST):', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create event',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    )
  }
}