import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    logger.info('Public event API: Fetching event', { eventId: id })

    const event = await db.content.findUnique({
      where: {
        id: id,
        type: 'EVENT',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC'
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
        updatedAt: true,
        creatorId: true,
        photos: {
          select: {
            id: true,
            originalUrl: true,
            thumbnailUrl: true,
            smallUrl: true,
            mediumUrl: true,
            largeUrl: true,
            caption: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        content_participants: {
          select: {
            id: true,
            userId: true,
            role: true,
            canEdit: true,
            isMandatory: true,
            isCoHost: true,
            invitedAt: true,
            joinedAt: true,
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            content_participants: true
          }
        }
      }
    })

    if (!event) {
      logger.warn('Public event API: Event not found or not public', { eventId: id })
      return NextResponse.json({
        success: false,
        error: 'Event not found or not public'
      }, { status: 404 })
    }

    // Transform the data to match the expected format
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      city: event.city,
      startTime: event.startTime,
      endTime: event.endTime,
      image: event.photos && event.photos.length > 0 
        ? event.photos[0].originalUrl || event.photos[0].largeUrl || event.photos[0].mediumUrl
        : event.image,
      photos: event.photos || [],
      price: event.priceMin,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      creator: {
        id: event.users?.id,
        name: event.users?.name || 'Unknown',
        username: event.users?.username || 'unknown',
        avatar: event.users?.avatar
      },
      participants: event.content_participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        role: participant.role,
        canEdit: participant.canEdit,
        isMandatory: participant.isMandatory,
        isCoHost: participant.isCoHost,
        invitedAt: participant.invitedAt,
        joinedAt: participant.joinedAt,
        user: {
          id: participant.users?.id,
          name: participant.users?.name || 'Unknown',
          username: participant.users?.username || 'unknown',
          avatar: participant.users?.avatar
        }
      })),
      _count: {
        participants: event._count.content_participants
      }
    }

    logger.info('Public event API: Successfully fetched event', { eventId: id })

    return NextResponse.json({
      success: true,
      event: transformedEvent
    })

  } catch (error) {
    logger.error('Public event API: Error fetching event', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch event'
    }, { status: 500 })
  }
}
