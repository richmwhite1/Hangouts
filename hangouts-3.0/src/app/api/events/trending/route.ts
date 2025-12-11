import { NextRequest, NextResponse } from 'next/server'
import { getTrendingEvents, generateCacheKey, CACHE_TTL_MS } from '@/lib/google-search'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/events/trending
 * 
 * Get trending events for a location
 * Results are heavily cached since trending events change slowly
 * 
 * Query params:
 * - location: Location/city (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    // Validation
    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      )
    }

    // Generate cache key for trending events
    const cacheKey = generateCacheKey('trending', location)

    // Check cache first
    try {
      const cached = await db.eventCache.findUnique({
        where: { cacheKey }
      })

      if (cached && cached.expiresAt > new Date()) {
        logger.info('Trending events cache hit:', { cacheKey })
        return NextResponse.json({
          success: true,
          events: cached.data as any[],
          cached: true,
          location
        })
      }
    } catch (error) {
      // If EventCache table doesn't exist yet, continue without caching
      logger.warn('EventCache not available, skipping cache check:', error)
    }

    // Fetch fresh trending events
    const events = await getTrendingEvents(location)

    // Store in cache
    try {
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS)
      
      await db.eventCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          data: events as any,
          expiresAt
        },
        update: {
          data: events as any,
          expiresAt
        }
      })

      logger.info('Trending events cached:', { cacheKey, count: events.length })
    } catch (error) {
      logger.warn('Could not cache trending events:', error)
    }

    return NextResponse.json({
      success: true,
      events,
      cached: false,
      location
    })
  } catch (error: any) {
    logger.error('Error fetching trending events:', error)
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch trending events',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}


