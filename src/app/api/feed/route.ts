import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

async function getFeedHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const feedType = searchParams.get('type') || 'home' // 'home' or 'discover'
  const contentType = searchParams.get('contentType') || 'all' // 'all', 'hangouts', 'events'
  const location = searchParams.get('location')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get user ID for friend context (optional for discover page)
  let userId: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (payload) {
      userId = payload.userId
    }
  }

  try {
    console.log('Feed API: Starting request processing')
    let friendIds: string[] = []
    
    // If user is authenticated, get their friends for FRIENDS_ONLY content
    if (userId) {
      console.log('Feed API: Getting friends for user:', userId)
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
      console.log('Feed API: Found friends:', friendIds.length)
    }

    // Build where clause based on feed type
    let whereClause: any = {
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
    if (feedType === 'discover') {
      // DISCOVER PAGE: Show public content + friends' content
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
      // HOME FEED: Show content user created or was invited to
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
          // Content user has saved
          {
            eventSaves: {
              some: { userId: userId }
            }
          }
        ]
        console.log('Feed API: Using OR filter for user:', userId)
      } else {
        // If no user, show nothing for home feed
        whereClause.id = 'nonexistent'
      }
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

    console.log('Feed API: Executing content query with whereClause:', JSON.stringify(whereClause, null, 2))
    console.log('Feed API: User ID:', userId)
    console.log('Feed API: Feed type:', feedType)
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
      orderBy: feedType === 'home' ? { createdAt: 'desc' } : { startTime: 'asc' },
      take: limit,
      skip: offset,
    })

    // Transform the data for frontend consumption
    const transformedContent = content.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      image: item.image,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      startTime: item.startTime?.toISOString(),
      endTime: item.endTime?.toISOString(),
      privacyLevel: item.privacyLevel,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      creator: item.users,
      participants: item.content_participants.map(p => ({
        id: p.id,
        contentId: p.contentId,
        userId: p.userId,
        role: p.role,
        canEdit: p.canEdit,
        isMandatory: p.isMandatory,
        isCoHost: p.isCoHost,
        invitedAt: p.invitedAt.toISOString(),
        joinedAt: p.joinedAt?.toISOString(),
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
        participants: item._count.content_participants,
        comments: item._count.comments,
        likes: item._count.content_likes,
        shares: item._count.content_shares,
        messages: item._count.messages,
        photos: item._count.photos,
        rsvps: item._count.rsvps,
        saves: item._count.eventSaves
      }
    }))

    return NextResponse.json({ 
      success: true,
      data: { 
        content: transformedContent,
        pagination: {
          limit,
          offset,
          total: transformedContent.length,
          hasMore: transformedContent.length === limit
        }
      }
    })
  } catch (error) {
    console.error('Database error in getFeedHandler:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      message: 'Failed to fetch feed content' 
    }, { status: 500 })
  }
}

export const GET = getFeedHandler
