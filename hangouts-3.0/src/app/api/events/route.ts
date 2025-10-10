import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

// GET /api/events - List events
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Events API: GET request received')
    
    // Handle query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    console.log('🔍 Query params:', { search, category, dateFrom, dateTo })
    console.log('🔍 Available db models:', Object.keys(db))
    
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
      console.log('Events API: No authenticated user, showing public events')
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
    const whereClause: any = {
      type: 'EVENT',
      OR: [
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
      ],
      status: 'PUBLISHED'
    }
    
    if (search) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { venue: { contains: search } },
            { city: { contains: search } }
          ]
        }
      ]
    }
    
    if (category) {
      whereClause.category = category
    }
    
    if (dateFrom || dateTo) {
      whereClause.startTime = {}
      if (dateFrom) {
        whereClause.startTime.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.startTime.lte = new Date(dateTo)
      }
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
      take: 20
    })

    console.log('📊 Events found:', events.length)

    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: 'OTHER', // Default category since we don't have categories in unified table
      venue: event.venue || '',
      address: event.address || '',
      city: event.city || '',
      startDate: event.startTime?.toISOString() || new Date().toISOString(),
      startTime: '14:00', // Default time since we don't store separate time
      coverImage: event.image || '/placeholder-event.jpg',
      price: {
        min: event.priceMin || 0,
        max: event.priceMax,
        currency: event.currency || 'USD'
      },
      tags: [], // No tags in unified table for now
      attendeeCount: event.attendeeCount || 0,
      isPublic: event.privacyLevel === 'PUBLIC',
      creator: event.users,
      createdAt: event.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      events: transformedEvents
    })

  } catch (error) {
    console.error('❌ Events API Error:', error)
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Events API: POST request received')
    
    const body = await request.json()
    console.log('📊 Request body:', JSON.stringify(body, null, 2))

    // Get user ID from token
    const authHeader = request.headers.get('authorization')
    let userId = 'cmfyi6rmm0000jp4yv9r4nq8c' // Default fallback
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      if (payload) {
        userId = user.id
      }
    }

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
        status: 'PUBLISHED',
        privacyLevel: body.isPublic !== false ? 'PUBLIC' : 'PRIVATE',
        creatorId: userId,
        updatedAt: new Date(),
        // Event-specific fields
        venue: body.venue || '',
        address: body.address || '',
        city: body.city || '',
        state: body.state || '',
        zipCode: body.zipCode || '',
        priceMin: body.priceMin || 0,
        priceMax: body.priceMax || null,
        currency: body.currency || 'USD',
        ticketUrl: body.ticketUrl || '',
        attendeeCount: body.attendeeCount || 0,
        externalEventId: body.eventUrl ? `external_${Date.now()}` : null,
        source: body.eventUrl ? 'OTHER' : 'MANUAL'
      }
    })

    console.log('✅ Event created:', event.id)

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

  } catch (error) {
    console.error('❌ Events API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create event', details: error.message },
      { status: 500 }
    )
  }
}