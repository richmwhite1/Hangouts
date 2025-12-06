import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createStartTimeFilter } from '@/lib/date-utils'

async function getFeedHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const feedType = searchParams.get('type') || 'home' // 'home' or 'discover'
  const contentType = searchParams.get('contentType') || 'all' // 'all', 'hangouts', 'events'
  const location = searchParams.get('location')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100
  const offset = (page - 1) * limit
  const includePast = searchParams.get('includePast') === 'true'
  const sortBy = searchParams.get('sortBy') || 'recent_activity' // 'recent_activity' or 'chronological'
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

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
    // User not authenticated - that's okay for discover page
    logger.debug('No authenticated user for feed request', {}, 'FEED')
  }

  try {
    logger.debug('Starting feed request processing', { feedType, contentType, userId }, 'FEED')
    let friendIds: string[] = []
    
    // If user is authenticated, get their friends for FRIENDS_ONLY content
    if (userId) {
      logger.debug('Getting friends for user', { userId }, 'FEED')
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
      logger.debug('Found friends', { count: friendIds.length }, 'FEED')
    }

    // Build where clause based on feed type
    const whereClause: any = {
      status: 'PUBLISHED'
    }

    // Content type filter
    if (contentType === 'hangouts') {
      whereClause.type = 'HANGOUT'
    } else if (contentType === 'events') {
      whereClause.type = 'EVENT'
    }
    // If contentType is 'all', don't filter by type

    // Privacy and access control
    if (feedType === 'discover' || contentType === 'events') {
      // DISCOVER PAGE & EVENTS PAGE: Show public content + friends' content
      whereClause.OR = [
        // Public content (everyone can see)
        { privacyLevel: 'PUBLIC' },
        // Friends-only content from user's friends (if authenticated)
        ...(userId && friendIds.length > 0 ? [{
          AND: [
            { privacyLevel: 'FRIENDS_ONLY' },
            { creatorId: { in: friendIds } }
          ]
        }] : [])
      ]
    } else {
      // HOME FEED: Show content user created, was invited to, has saved/RSVP'd, OR public content
      if (userId) {
        whereClause.OR = [
          // User's own content (all privacy levels)
          { creatorId: userId },
          // Content where user is a participant (invited)
          {
            content_participants: {
              some: { userId: userId }
            }
          },
          // Content user has saved (for events)
          {
            eventSaves: {
              some: { userId: userId }
            }
          },
          // Content user has RSVP'd to (for events)
          {
            rsvps: {
              some: { 
                userId: userId,
                status: { in: ['YES', 'MAYBE'] }
              }
            }
          },
          // PUBLIC content (everyone can see public hangouts and events)
          { privacyLevel: 'PUBLIC' }
        ]
        logger.debug('Using OR filter for user', { userId }, 'FEED')
      } else {
        // If no user, show only public content
        whereClause.privacyLevel = 'PUBLIC'
      }
    }

    // Add time filter
    const startTimeFilter = createStartTimeFilter({
      startDate: startDateParam,
      endDate: endDateParam,
      includePast
    })
    if (startTimeFilter) {
      whereClause.startTime = startTimeFilter
    }

    // Add location filter
    if (location) {
      whereClause.location = {
        contains: location,
        mode: 'insensitive'
      }
    }

    // Add date filters
    if (startDate || endDate) {
      whereClause.startTime = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) })
      }
    }

    logger.debug('Executing content query', { whereClause, userId, feedType, page, limit, sortBy }, 'FEED')
    
    // Determine sort order based on sortBy parameter
    let orderBy: any
    if (sortBy === 'recent_activity') {
      // Sort by most recently updated first, then by start time
      orderBy = [
        { updatedAt: 'desc' as const },
        { startTime: 'asc' as const }
      ]
    } else {
      // Chronological by start time
      orderBy = feedType === 'home' 
        ? { startTime: 'asc' as const }
        : { startTime: 'asc' as const }
    }

    // Simplified query for debugging
    const content = await db.content.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        image: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        createdAt: true,
        updatedAt: true,
        // Event-specific fields
        venue: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        priceMin: true,
        priceMax: true,
        currency: true,
        ticketUrl: true,
        attendeeCount: true,
        externalEventId: true,
        source: true,
        // Hangout-specific fields
        maxParticipants: true,
        weatherEnabled: true,
        // Creator info
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
            isActive: true
          }
        },
        // Participants
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                lastSeen: true,
                isActive: true
              }
            }
          }
        },
        // Event tags
        eventTags: {
          select: {
            tag: true
          }
        },
        // Event images
        eventImages: {
          select: {
            imageUrl: true,
            orderIndex: true
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        // Event saves
        eventSaves: {
          select: {
            userId: true,
            createdAt: true
          }
        },
        // Polls (for hangouts)
        polls: {
          select: {
            id: true,
            title: true,
            description: true,
            options: true,
            status: true,
            consensusPercentage: true,
            expiresAt: true,
            createdAt: true
          }
        },
        // Photos
        photos: {
          select: {
            id: true,
            originalUrl: true,
            thumbnailUrl: true,
            caption: true,
            createdAt: true,
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Limit photos for feed
        },
        // RSVPs
        rsvps: {
          select: {
            id: true,
            userId: true,
            status: true,
            respondedAt: true,
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        // Counts
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true,
            photos: true,
            rsvps: true,
            eventSaves: true
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset
    })

    // Get total count for hasMore calculation
    const totalCount = await db.content.count({
      where: whereClause
    })

    logger.debug('Raw content found', { count: content.length, total: totalCount, firstItem: content[0] ? { id: content[0].id, title: content[0].title } : null }, 'FEED')

    // Transform the data for frontend consumption
    const transformedContent = content.map(item => {
      try {
        // Find current user's RSVP status
        let myRsvpStatus = 'PENDING'
        if (userId && item.rsvps && Array.isArray(item.rsvps)) {
          const userRsvp = item.rsvps.find(rsvp => rsvp.userId === userId)
          if (userRsvp) {
            myRsvpStatus = userRsvp.status
          }
        }
      
      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        image: item.type === 'HANGOUT' && item.photos && item.photos.length > 0 
          ? item.photos[0]?.originalUrl || item.photos[0]?.thumbnailUrl 
          : item.image,
        location: item.location,
        latitude: item.latitude,
        longitude: item.longitude,
        startTime: item.startTime?.toISOString(),
        endTime: item.endTime?.toISOString(),
        privacyLevel: item.privacyLevel,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        creator: item.users,
        myRsvpStatus: myRsvpStatus,
        participants: (item.content_participants || []).map(p => ({
          id: p.id,
          contentId: p.contentId,
          userId: p.userId,
          role: p.role,
          canEdit: p.canEdit,
          isMandatory: p.isMandatory,
          isCoHost: p.isCoHost,
          invitedAt: p.invitedAt?.toISOString() || null,
          joinedAt: p.joinedAt?.toISOString() || null,
          user: p.users
        })),
        // Event-specific data
        ...(item.type === 'EVENT' && {
          venue: item.venue,
          address: item.address,
          city: item.city,
          state: item.state,
          zipCode: item.zipCode,
          price: {
            min: item.priceMin,
            max: item.priceMax,
            currency: item.currency
          },
          ticketUrl: item.ticketUrl,
          attendeeCount: item.attendeeCount,
          externalEventId: item.externalEventId,
          source: item.source,
          tags: item.eventTags.map(tag => tag.tag),
          images: item.eventImages.map(img => img.imageUrl),
          saveCount: item._count.eventSaves
        }),
        // Hangout-specific data
        ...(item.type === 'HANGOUT' && {
          maxParticipants: item.maxParticipants,
          weatherEnabled: item.weatherEnabled,
          polls: item.polls.map(poll => ({
            id: poll.id,
            title: poll.title,
            description: poll.description,
            options: poll.options,
            status: poll.status,
            consensusPercentage: poll.consensusPercentage,
            expiresAt: poll.expiresAt?.toISOString(),
            createdAt: poll.createdAt.toISOString()
          }))
        }),
        // Common data
        photos: item.photos.map(photo => ({
          id: photo.id,
          originalUrl: photo.originalUrl,
          thumbnailUrl: photo.thumbnailUrl,
          caption: photo.caption,
          createdAt: photo.createdAt.toISOString(),
          user: photo.users
        })),
        rsvps: item.rsvps.map(rsvp => ({
          id: rsvp.id,
          contentId: item.id,
          userId: rsvp.userId,
          status: rsvp.status,
          respondedAt: rsvp.respondedAt?.toISOString(),
          user: rsvp.users
        })),
        counts: {
          participants: item._count?.content_participants || 0,
          comments: item._count?.comments || 0,
          likes: item._count?.content_likes || 0,
          shares: item._count?.content_shares || 0,
          messages: item._count?.messages || 0,
          photos: item._count?.photos || 0,
          rsvps: item._count?.rsvps || 0,
          saves: item._count?.eventSaves || 0
        }
      }
      } catch (transformError) {
        logger.error('Error transforming content item:', item.id, String(transformError));
        return null;
      }
    }).filter(item => item !== null)

    return NextResponse.json({ 
      success: true,
      data: { 
        content: transformedContent,
        pagination: {
          page,
          limit,
          offset,
          total: totalCount,
          hasMore: offset + transformedContent.length < totalCount
        }
      }
    })
  } catch (error) {
    logger.error('Database error in getFeedHandler:', error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
      logger.error('Error message:', error.message);
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      message: 'Failed to fetch feed content' 
    }, { status: 500 })
  }
}

export const GET = getFeedHandler

