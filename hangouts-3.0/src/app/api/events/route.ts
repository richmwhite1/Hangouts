import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

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
            { location: { contains: search } }
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

    // console.log('📊 Events found:', events.length); // Removed for production

    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: 'OTHER', // Default category since we don't have categories in unified table
      venue: event.location || '',
      address: event.location || '',
      city: event.location || '',
      startDate: event.startTime?.toISOString() || new Date().toISOString(),
      startTime: '14:00', // Default time since we don't store separate time
      coverImage: event.image || '/placeholder-event.jpg',
      price: {
        min: 0,
        max: 0,
        currency: 'USD'
      },
      tags: [], // No tags in unified table for now
      attendeeCount: 0, // Default count
      isPublic: event.privacyLevel === 'PUBLIC',
      creator: event.users,
      createdAt: event.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      events: transformedEvents
    })

  } catch (error) {
    logger.error('❌ Events API Error:', error);
    logger.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
    logger.error('❌ Events API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}