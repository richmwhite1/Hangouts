import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const feedType = searchParams.get('type') || 'home'
  const contentType = searchParams.get('contentType') || 'all'
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get user ID for friend context (optional for discover page)
  let userId: string | null = null

  // Try Clerk authentication
  const { userId: clerkUserId } = await auth()
  if (clerkUserId) {
    const clerkUser = await getClerkApiUser()
    if (clerkUser) {
      userId = clerkUser.id
      console.log('Simple Feed API: Using Clerk user ID:', userId)
    }
  }
  
  // For unauthenticated users, return empty feed
  if (!userId) {
    console.log('Simple Feed API: No authenticated user, returning empty feed')
    return NextResponse.json({ 
      success: true,
      data: { 
        content: [], 
        total: 0 
      } 
    })
  }

  try {
    console.log('Simple Feed API: Starting request processing')
    console.log('Simple Feed API: User ID:', userId)
    console.log('Simple Feed API: Feed type:', feedType)
    console.log('Simple Feed API: Content type:', contentType)

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
    } else {
      // HOME FEED: Show content user created, was invited to, or has saved/RSVP'd
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
          }
        ]
        console.log('Simple Feed API: Using OR filter for user:', userId)
      } else {
        // If no user, show nothing for home feed
        whereClause.id = 'nonexistent'
      }
    }
    
    // For debugging, let's use a simpler approach
    if (userId && feedType === 'home') {
      whereClause = {
        status: 'PUBLISHED',
        type: 'HANGOUT',
        creatorId: userId
      }
      console.log('Simple Feed API: Using simplified where clause for debugging')
    }

    console.log('Simple Feed API: Executing content query with whereClause:', JSON.stringify(whereClause, null, 2))
    
    // Test the where clause step by step
    console.log('Simple Feed API: Testing where clause components...')
    console.log('  - status:', whereClause.status)
    console.log('  - type:', whereClause.type)
    console.log('  - OR clause:', whereClause.OR ? whereClause.OR.length : 'none')

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
      skip: offset})

    console.log('Simple Feed API: Raw content found:', content.length, 'items')
    console.log('Simple Feed API: First content item:', content[0] ? { id: content[0].id, title: content[0].title } : 'None')

    // Simple transformation
    const transformedContent = content.map(item => ({
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
      creator: item.users, // This should match what StackedHangoutTile expects
      users: item.users, // Also include users field for compatibility
      myRsvpStatus: 'PENDING',
      participants: [],
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
    }))

    console.log('Simple Feed API: Transformed content:', transformedContent.length, 'items')

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
    console.error('Simple Feed API: Database error:', error)
    if (error instanceof Error) {
      console.error('Simple Feed API: Error stack:', error.stack)
      console.error('Simple Feed API: Error message:', error.message)
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      message: 'Failed to fetch feed content' 
    }, { status: 500 })
  }
}
