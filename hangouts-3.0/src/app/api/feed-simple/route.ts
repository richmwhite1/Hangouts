import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { getOptimizedFeed } from '@/lib/database-optimization'
import { apiCache, cacheKeys } from '@/lib/api-cache'
import { checkRateLimit, rateLimitConfigs } from '@/lib/enhanced-rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Check rate limit first
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.feed)
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  const { searchParams } = new URL(request.url)
  const feedType = searchParams.get('type') || 'home'
  const contentType = searchParams.get('contentType') || 'all'
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get authenticated user
  let userId: string | null = null
  try {
    const { userId: clerkUserId } = await auth()
    if (clerkUserId) {
      const clerkUser = await getClerkApiUser()
      if (clerkUser) {
        userId = clerkUser.id
      }
    }
  } catch (error) {
    logger.error('Auth error in feed:', error)
  }
  
  // For unauthenticated users, return empty feed
  if (!userId) {
    return NextResponse.json({ 
      success: true,
      data: { 
        content: [], 
        total: 0 
      } 
    })
  }

  try {
    // Check cache first
    const cacheKey = cacheKeys.userFeed(userId, feedType, offset)
    const cached = apiCache.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      })
    }

    // Use optimized feed query
    const { content, totalCount, hasMore } = await getOptimizedFeed(
      userId,
      feedType as 'home' | 'discover',
      limit,
      offset
    )

    // Transform content for frontend
    const transformedContent = content.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      image: item.image,
      location: item.location,
      startTime: item.startTime,
      endTime: item.endTime,
      privacyLevel: item.privacyLevel,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      creator: item.users,
      creatorId: item.creatorId,
      counts: item._count
    }))

    // Cache the response for 2 minutes
    const responseData = {
      content: transformedContent,
      total: totalCount,
      hasMore,
      pagination: {
        limit,
        offset,
        total: totalCount
      }
    }
    apiCache.set(cacheKey, responseData, 2 * 60 * 1000)

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error('Error fetching feed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch feed',
        message: 'An error occurred while loading content'
      },
      { status: 500 }
    )
  }
}
