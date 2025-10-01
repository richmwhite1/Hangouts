import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/events/[id] - Get a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    // Optional authentication - events can be viewed publicly
    let userId = null
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        userId = payload.userId
      }
    }

    const event = await db.content.findUnique({
      where: { 
        id: eventId,
        type: 'EVENT'
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(createErrorResponse('Event not found', 'Event does not exist'), { status: 404 })
    }

    // Check if user has access to the event
    const hasAccess = event.privacyLevel === 'PUBLIC' || 
                     event.creatorId === userId ||
                     (event.content_participants && event.content_participants.some(p => p.userId === userId))

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Access denied', 'You do not have permission to view this event'), { status: 403 })
    }

    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description || '',
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
      creator: event.users || {
        id: '',
        name: 'Unknown',
        username: 'unknown',
        avatar: ''
      },
      createdAt: event.createdAt.toISOString()
    }

    return NextResponse.json(createSuccessResponse({ event: transformedEvent }, 'Event retrieved successfully'))

  } catch (error: any) {
    console.error('Error fetching event:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch event', error.message), { status: 500 })
  }
}

