import { NextRequest, NextResponse } from 'next/server'
import { TrendingService } from '@/lib/trending-service'

/**
 * GET /api/discover/trending
 * Get trending events and hangouts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location') || undefined
    const type = searchParams.get('type') as 'EVENT' | 'HANGOUT' | undefined
    const limit = parseInt(searchParams.get('limit') || '20')

    let trending

    if (type === 'EVENT') {
      trending = await TrendingService.getTrendingEvents(location, limit)
    } else if (type === 'HANGOUT') {
      trending = await TrendingService.getTrendingHangouts(location, limit)
    } else {
      trending = await TrendingService.getTrending({ location, limit })
    }

    // Transform to match expected format
    const transformedContent = trending.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      image: item.image,
      location: item.location,
      city: item.city,
      venue: item.venue,
      startTime: item.startTime,
      endTime: item.endTime,
      price: {
        min: item.priceMin || 0,
        max: item.priceMax,
        currency: item.currency || 'USD'
      },
      creator: item.users ? {
        id: item.users.id,
        name: item.users.name,
        username: item.users.username,
        avatar: item.users.avatar
      } : null,
      attendeeCount: item.attendeeCount || 0,
      saveCount: item.eventSaves?.length || 0,
      viewCount: item.viewCount || 0,
      shareCount: item.shareCount || 0,
      createdAt: item.createdAt
    }))

    return NextResponse.json({
      success: true,
      trending: transformedContent,
      cached: true, // Indicates these results are cached
      cacheInfo: TrendingService.getCacheStats()
    })
  } catch (error) {
    console.error('Error fetching trending content:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trending content' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/discover/trending/view
 * Increment view count for content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId } = body

    if (!contentId) {
      return NextResponse.json(
        { success: false, message: 'Content ID is required' },
        { status: 400 }
      )
    }

    await TrendingService.incrementViewCount(contentId)

    return NextResponse.json({
      success: true,
      message: 'View count incremented'
    })
  } catch (error) {
    console.error('Error incrementing view count:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to increment view count' },
      { status: 500 }
    )
  }
}

