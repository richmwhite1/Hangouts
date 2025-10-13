import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedType = searchParams.get('type') || 'home'
    const contentType = searchParams.get('contentType') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Log request details for debugging
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const authorization = request.headers.get('authorization') || 'none'
    const origin = request.headers.get('origin') || 'none'
    
    logger.info('Feed API called:', { 
      feedType, 
      contentType, 
      limit, 
      offset,
      userAgent: userAgent.substring(0, 50),
      hasAuth: authorization !== 'none',
      origin: origin.substring(0, 50)
    })

    // Get authenticated user
    let userId: string | null = null
    try {
      const { userId: clerkUserId } = await auth()
      logger.info('Clerk auth result:', { clerkUserId })
      
      if (clerkUserId) {
        try {
          const clerkUser = await getClerkApiUser()
          logger.info('Clerk user result:', { userId: clerkUser?.id })
          if (clerkUser) {
            userId = clerkUser.id
          } else {
            // User exists in Clerk but not in database - use Clerk ID as fallback
            logger.warn('User exists in Clerk but not in database, using Clerk ID as fallback')
            userId = clerkUserId
          }
        } catch (userError) {
          logger.error('Error getting Clerk user:', userError)
          // Fallback to Clerk ID if database lookup fails
          userId = clerkUserId
        }
      }
    } catch (error) {
      logger.error('Auth error in feed:', error)
    }
    
    // For unauthenticated users, return public content only
    if (!userId) {
      try {
        logger.info('No user ID, returning public content')
        const publicContent = await db.content.findMany({
          where: {
            status: 'PUBLISHED',
            privacyLevel: 'PUBLIC',
            type: 'HANGOUT'
          },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            image: true,
            location: true,
            startTime: true,
            endTime: true,
            privacyLevel: true,
            createdAt: true,
            updatedAt: true,
            creatorId: true,
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            _count: {
              select: {
                content_participants: true,
                comments: true,
                photos: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        })

        const total = await db.content.count({
          where: {
            status: 'PUBLISHED',
            privacyLevel: 'PUBLIC',
            type: 'HANGOUT'
          }
        })

        logger.info('Public content fetched:', { count: publicContent.length, total })

        return NextResponse.json({ 
          success: true,
          data: { 
            content: publicContent, 
            total,
            hasMore: offset + publicContent.length < total
          } 
        })
      } catch (error) {
        logger.error('Error fetching public feed:', error)
        return NextResponse.json({ 
          success: true,
          data: { 
            content: [], 
            total: 0 
          } 
        })
      }
    }

    try {
      logger.info('User authenticated, fetching personalized feed for user:', userId)
      
      // Build where clause based on feed type
      let whereClause: any = {
        status: 'ACTIVE'
      }

      // Content type filter
      if (contentType === 'hangouts') {
        whereClause.type = 'HANGOUT'
      } else if (contentType === 'events') {
        whereClause.type = 'EVENT'
      }

      // Privacy and access control
      if (feedType === 'discover' || contentType === 'events') {
        // DISCOVER PAGE & EVENTS PAGE: Show public content + friends' content
        whereClause.OR = [
          // Public content (everyone can see)
          { privacyLevel: 'PUBLIC' },
          // Friends-only content from user's friends (if authenticated)
          ...(userId ? [{
            AND: [
              { privacyLevel: 'FRIENDS_ONLY' },
              { creatorId: userId }
            ]
          }] : [])
        ]
      } else if (feedType === 'home') {
        // HOME PAGE: Show user's own content + content they're invited to
        whereClause.OR = [
          // User's own content (all privacy levels)
          { creatorId: userId },
          // Content where user is a participant
          {
            content_participants: {
              some: { userId: userId }
            }
          }
        ]
      }

      // Simple query with minimal fields
      const content = await db.content.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          image: true,
          location: true,
          startTime: true,
          endTime: true,
          privacyLevel: true,
          createdAt: true,
          updatedAt: true,
          creatorId: true,
          // Creator info
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
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
        skip: offset
      })

      // Get total count for pagination
      const total = await db.content.count({ where: whereClause })

      logger.info('Personalized content fetched:', { count: content.length, total })

      return NextResponse.json({
        success: true,
        data: {
          content,
          total,
          hasMore: offset + content.length < total,
          pagination: {
            limit,
            offset,
            total
          }
        }
      })

    } catch (error) {
      logger.error('Error fetching personalized feed:', error)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch feed',
          message: 'An error occurred while loading content',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (outerError) {
    logger.error('Outer error in feed API:', outerError)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        details: outerError instanceof Error ? outerError.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}