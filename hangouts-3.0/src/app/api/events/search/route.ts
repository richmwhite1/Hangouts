import { NextRequest, NextResponse } from 'next/server'
import { searchEvents, generateCacheKey, CACHE_TTL_MS } from '@/lib/google-search'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/events/search
 * 
 * Search for events using Google Custom Search API with intelligent caching
 * 
 * Query params:
 * - q: Search query (required)
 * - location: Location/city (required)
 * - limit: Max results (optional, default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const location = searchParams.get('location')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Validation
    if (!query || !location) {
      return NextResponse.json(
        { error: 'Query and location are required' },
        { status: 400 }
      )
    }

    // Generate cache key
    const cacheKey = generateCacheKey(query, location)

    // Check cache first
    try {
      const cached = await db.eventCache.findUnique({
        where: { cacheKey }
      })

      if (cached && cached.expiresAt > new Date()) {
        logger.info('Event search cache hit:', { cacheKey })
        return NextResponse.json({
          success: true,
          events: cached.data as any[],
          cached: true,
          cacheAge: Date.now() - cached.createdAt.getTime()
        })
      }

      // Cache miss or expired
      if (cached) {
        logger.info('Event search cache expired:', { cacheKey })
      } else {
        logger.info('Event search cache miss:', { cacheKey })
      }
    } catch (error) {
      // If EventCache table doesn't exist yet, continue without caching
      logger.warn('EventCache not available, skipping cache check:', error)
    }

    // Fetch fresh results from Google
    const events = await searchEvents(query, location, { limit })

    // Store in cache for future requests
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

      logger.info('Event search results cached:', { cacheKey, count: events.length })
    } catch (error) {
      // If EventCache table doesn't exist, log warning but continue
      logger.warn('Could not cache event search results:', error)
    }

    return NextResponse.json({
      success: true,
      events,
      cached: false,
      query,
      location
    })
  } catch (error: any) {
    logger.error('Error searching events:', error)
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to search events',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/search
 * 
 * Batch search for multiple queries
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queries, location, limit = 5 } = body

    if (!Array.isArray(queries) || !location) {
      return NextResponse.json(
        { error: 'queries (array) and location are required' },
        { status: 400 }
      )
    }

    // Search for each query in parallel
    const results = await Promise.all(
      queries.map(async (query: string) => {
        try {
          const events = await searchEvents(query, location, { limit })
          return { query, events, success: true }
        } catch (error: any) {
          logger.error(`Error searching for "${query}":`, error)
          return { query, events: [], success: false, error: error.message }
        }
      })
    )

    return NextResponse.json({
      success: true,
      results,
      location
    })
  } catch (error: any) {
    logger.error('Error in batch event search:', error)
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to batch search events',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
