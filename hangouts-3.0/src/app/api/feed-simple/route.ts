import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createStartTimeFilter } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedType = searchParams.get('type') || 'home'
    const contentType = searchParams.get('contentType') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includePast = searchParams.get('includePast') === 'true'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

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
      console.log('🔑 Feed API - Clerk auth result:', { clerkUserId })
      logger.info('Clerk auth result:', { clerkUserId })
      
      if (clerkUserId) {
        try {
          const clerkUser = await getClerkApiUser()
          console.log('👤 Feed API - Database user:', { 
            userId: clerkUser?.id, 
            username: clerkUser?.username,
            email: clerkUser?.email 
          })
          logger.info('Clerk user result:', { userId: clerkUser?.id, username: clerkUser?.username })
          if (clerkUser) {
            userId = clerkUser.id
          } else {
            // User exists in Clerk but not in database - use Clerk ID as fallback
            console.warn('⚠️ Feed API - User exists in Clerk but not in database')
            logger.warn('User exists in Clerk but not in database, using Clerk ID as fallback')
            userId = clerkUserId
          }
        } catch (userError) {
          console.error('❌ Feed API - Error getting Clerk user:', userError)
          logger.error('Error getting Clerk user:', userError)
          // Fallback to Clerk ID if database lookup fails
          userId = clerkUserId
        }
      }
    } catch (error) {
      console.error('❌ Feed API - Auth error:', error)
      logger.error('Auth error in feed:', error)
    }
    
        // console.log('🎯 Feed API - Final userId for query:', userId)
        
        // For unauthenticated users, return public content only
        if (!userId) {
      try {
        logger.info('No user ID, returning public content')
        const publicWhere: any = {
          privacyLevel: 'PUBLIC',
          type: contentType === 'events' ? 'EVENT' : 'HANGOUT'
        }
        const publicStartFilter = createStartTimeFilter({
          startDate: startDateParam,
          endDate: endDateParam,
          includePast
        })
        if (publicStartFilter) {
          publicWhere.startTime = publicStartFilter
        }

        const publicContent = await db.content.findMany({
          where: publicWhere,
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
            // RSVP data for current user (if authenticated)
            ...(userId ? {
              rsvps: {
                where: { userId: userId },
                select: {
                  id: true,
                  userId: true,
                  status: true,
                  respondedAt: true
                }
              }
            } : {}),
            // Participant data
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
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        })

        const total = await db.content.count({
          where: publicWhere
        })

        logger.info('Public content fetched:', { count: publicContent.length, total })

        // Transform the data for frontend consumption
        const transformedPublicContent = publicContent.map(item => {
          try {
            // Find current user's RSVP status (if authenticated)
            let myRsvpStatus = 'PENDING'
            if (userId && item.rsvps && Array.isArray(item.rsvps)) {
              const userRsvp = item.rsvps.find(rsvp => rsvp.userId === userId)
              if (userRsvp) {
                myRsvpStatus = userRsvp.status
              }
            }

            // Transform participants data
            const participants = (item.content_participants || []).map(p => ({
              id: p.id,
              contentId: item.id,
              userId: p.userId,
              role: p.role,
              canEdit: p.canEdit,
              isMandatory: p.isMandatory,
              isCoHost: p.isCoHost,
              invitedAt: p.invitedAt?.toISOString() || null,
              joinedAt: p.joinedAt?.toISOString() || null,
              rsvpStatus: 'PENDING', // Default for participants
              user: p.users
            }))

            return {
              id: item.id,
              type: item.type,
              title: item.title,
              description: item.description,
              image: item.image,
              location: item.location,
              startTime: item.startTime?.toISOString(),
              endTime: item.endTime?.toISOString(),
              privacyLevel: item.privacyLevel,
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString(),
              creator: item.users,
              users: item.users,
              myRsvpStatus: myRsvpStatus,
              votingStatus: 'closed', // Default to closed, can be updated based on poll status
              participants: participants,
              _count: {
                participants: item._count?.content_participants || 0,
                comments: item._count?.comments || 0,
                content_likes: item._count?.content_likes || 0,
                content_shares: item._count?.content_shares || 0,
                messages: item._count?.messages || 0,
                photos: item._count?.photos || 0,
                rsvps: item._count?.rsvps || 0,
                eventSaves: item._count?.eventSaves || 0
              },
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
          } catch (error) {
            console.error('Error transforming public content item:', error);
            return item; // Return original item on error
          }
        })

        return NextResponse.json({ 
          success: true,
          data: { 
            content: transformedPublicContent, 
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
      let whereClause: any = {}

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
        // HOME PAGE: Show user's own content + content they're invited to + content they've RSVPed to + PUBLIC content
        whereClause.OR = [
          // User's own content (all privacy levels)
          { creatorId: userId },
          // Content where user is a participant (invited)
          {
            content_participants: {
              some: { userId: userId }
            }
          },
          // Content where user has RSVPed (interested/attending)
          {
            rsvps: {
              some: { 
                userId: userId,
                status: { in: ['YES', 'MAYBE', 'NO'] }
              }
            }
          },
          // PUBLIC content (everyone can see public hangouts and events)
          { privacyLevel: 'PUBLIC' }
        ]
      }

      const startTimeFilter = createStartTimeFilter({
        startDate: startDateParam,
        endDate: endDateParam,
        includePast
      })
      if (startTimeFilter) {
        whereClause.startTime = startTimeFilter
      }

      // Simple query with minimal fields
      // console.log('🔍 Feed API - Querying with whereClause:', JSON.stringify(whereClause, null, 2))
      
      let content;
      try {
        content = await db.content.findMany({
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
            lastActivityAt: true,
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
            // RSVP data for current user
            ...(userId ? {
              rsvps: {
                where: { userId: userId },
                select: {
                  id: true,
                  userId: true,
                  status: true,
                  respondedAt: true
                }
              }
            } : {}),
            // Participant data
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
        // Prioritize hangouts with recent activity, then sort by creation/start time
        // For home feed: sort by lastActivityAt DESC (nulls last), then createdAt DESC
        // For discover feed: sort by startTime ASC (upcoming events first)
        // Note: Prisma orderBy with nulls handling - we'll sort by lastActivityAt first
        // Items without lastActivityAt will appear after those with it
        orderBy: feedType === 'home' 
          ? [
              { lastActivityAt: 'desc' },
              { createdAt: 'desc' }
            ]
          : { startTime: 'asc' },
        take: limit,
        skip: offset
        })
      } catch (queryError) {
        console.error('❌ Database query error:', queryError)
        logger.error('Database query error:', queryError)
        throw queryError
      }

      // Get total count for pagination
      const total = await db.content.count({ where: whereClause })

      logger.info('Personalized content fetched:', { count: content.length, total })

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

          // Transform participants data
          const participants = (item.content_participants || []).map(p => ({
            id: p.id,
            contentId: item.id,
            userId: p.userId,
            role: p.role,
            canEdit: p.canEdit,
            isMandatory: p.isMandatory,
            isCoHost: p.isCoHost,
            invitedAt: p.invitedAt?.toISOString() || null,
            joinedAt: p.joinedAt?.toISOString() || null,
            rsvpStatus: 'PENDING', // Default for participants
            user: p.users
          }))

          return {
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            image: item.image,
            location: item.location,
            startTime: item.startTime?.toISOString(),
            endTime: item.endTime?.toISOString(),
            lastActivityAt: item.lastActivityAt?.toISOString(),
            privacyLevel: item.privacyLevel,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            creator: item.users, // This should match what StackedHangoutTile expects
            users: item.users, // Also include users field for compatibility
              myRsvpStatus: myRsvpStatus,
              votingStatus: 'closed', // Default to closed, can be updated based on poll status
              participants: participants,
              _count: {
                participants: item._count?.content_participants || 0,
                comments: item._count?.comments || 0,
                content_likes: item._count?.content_likes || 0,
                content_shares: item._count?.content_shares || 0,
                messages: item._count?.messages || 0,
                photos: item._count?.photos || 0,
                rsvps: item._count?.rsvps || 0,
                eventSaves: item._count?.eventSaves || 0
              },
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
        } catch (error) {
          console.error('Error transforming feed item:', error);
          return item; // Return original item on error
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          content: transformedContent,
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