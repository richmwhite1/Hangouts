import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    const attendedEvents = await db.content.findMany({
      where: {
        type: 'EVENT',
        content_participants: {
          some: {
            userId: userId
          }
        }
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedEvents = attendedEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: 'OTHER',
      venue: event.venue || '',
      address: event.address || '',
      city: event.city || '',
      startDate: event.startTime?.toISOString() || new Date().toISOString(),
      startTime: event.startTime?.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }) || '14:00',
      coverImage: event.image || '/placeholder-event.jpg',
      price: {
        min: event.priceMin || 0,
        max: event.priceMax,
        currency: event.currency || 'USD'
      },
      tags: [],
      attendeeCount: event.attendeeCount || 0,
      isPublic: event.privacyLevel === 'PUBLIC',
      creator: event.users,
      createdAt: event.createdAt.toISOString()
    }))

    return NextResponse.json(createSuccessResponse({ events: transformedEvents }, 'Attended events retrieved successfully'))

  } catch (error: any) {
    logger.error('Error fetching attended events:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch attended events', error.message), { status: 500 })
  }
}

