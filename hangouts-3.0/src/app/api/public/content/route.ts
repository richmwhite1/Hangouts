import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')?.toUpperCase()
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    logger.info('Public content API called:', { type, limit, offset, hasSearch: !!search })

    // Build where clause
    const whereClause: any = {
      status: 'PUBLISHED',
      privacyLevel: 'PUBLIC'
    }

    // Filter by type if provided
    if (type && (type === 'HANGOUT' || type === 'EVENT')) {
      whereClause.type = type
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Fetch content
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
            content_participants: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Get total count
    const total = await db.content.count({ where: whereClause })

    logger.info('Public content fetched:', { count: content.length, total })

    return NextResponse.json({
      success: true,
      content,
      total,
      hasMore: offset + content.length < total
    })

  } catch (error) {
    logger.error('Error fetching public content:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch public content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

