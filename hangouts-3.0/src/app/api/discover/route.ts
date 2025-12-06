import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse } from '@/lib/api-handler'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
async function getDiscoverHangoutsHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const includePast = searchParams.get('includePast') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Increased default to 50, max 100
  const offset = (page - 1) * limit

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
    // User not authenticated, continue with public content
    logger.debug('No authenticated user for discover page')
  }

  try {
    let friendIds: string[] = []
    
    // If user is authenticated, get their friends for FRIENDS_ONLY hangouts
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

    // DISCOVER PAGE LOGIC: Show public hangouts + friends' hangouts + user's own hangouts
    const privacyOr: any[] = [
      // Public hangouts (everyone can see)
      { privacyLevel: 'PUBLIC' },
      // User's own hangouts (if authenticated)
      ...(userId ? [{ creatorId: userId }] : []),
      // Friends-only hangouts from user's friends (if authenticated)
      ...(userId && friendIds.length > 0 ? [{
        AND: [
          { privacyLevel: 'FRIENDS_ONLY' },
          { creatorId: { in: friendIds } }
        ]
      }] : [])
    ]

    const whereClause: any = {
      AND: [
        {
          OR: privacyOr
        }
      ],
      status: 'PUBLISHED'
    }

    // Add location filter
    if (location) {
      whereClause.AND.push({
        location: {
          contains: location,
          mode: 'insensitive'
        }
      })
    }

    // Add date filters
    if (startDate || endDate) {
      whereClause.AND.push({
        startTime: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      })
    } else if (!includePast) {
      // Filter out past hangouts by default (show only future or ongoing hangouts)
      const now = new Date()
      whereClause.AND.push({
        OR: [
          { startTime: { gte: now } },
          {
            AND: [
              { startTime: { lt: now } },
              {
                OR: [
                  { endTime: { gte: now } },
                  { endTime: null }
                ]
              }
            ]
          }
        ]
      })
    }

    const hangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        ...whereClause
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        image: true,
        createdAt: true,
        updatedAt: true,
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
        photos: {
          select: {
            id: true,
            originalUrl: true,
            thumbnailUrl: true,
            caption: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
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
      orderBy: { startTime: 'asc' },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await db.content.count({
      where: {
        type: 'HANGOUT',
        ...whereClause
      }
    })

    // Transform hangouts to use first photo as primary image
    const transformedHangouts = hangouts.map(hangout => ({
      ...hangout,
      image: hangout.photos && hangout.photos.length > 0 
        ? hangout.photos[0].originalUrl || hangout.photos[0].thumbnailUrl 
        : hangout.image
    }))

    return createSuccessResponse({ 
      hangouts: transformedHangouts,
      pagination: {
        page,
        limit,
        offset,
        total: totalCount,
        hasMore: offset + transformedHangouts.length < totalCount
      }
    })
  } catch (error) {
    logger.error('Database error in getDiscoverHangoutsHandler:', error);
    return createErrorResponse('Database error', 'Failed to fetch discover hangouts', 500)
  }
}

export const GET = createApiHandler(getDiscoverHangoutsHandler, {
  requireAuth: false, // Keep false for discover page, but handle auth when present
  enableRateLimit: true,
  enableCORS: true
})
