import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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
    // Build where clause with search and category filters
    const whereClause: any = {
      type: 'EVENT',
      privacyLevel: 'PUBLIC'
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { venue: { contains: search } },
        { city: { contains: search } }
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
        userId = payload.userId
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