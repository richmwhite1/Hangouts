import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = (searchParams.get('type') || '').toUpperCase()
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city') || ''

    const whereBase: any = {
      isPublic: true,
      status: 'PUBLISHED',
    }

    if (typeParam === 'HANGOUT' || typeParam === 'EVENT') {
      whereBase.type = typeParam
    }

    if (search) {
      whereBase.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (city) {
      whereBase.city = { contains: city, mode: 'insensitive' }
    }

    const select = {
      id: true,
      type: true,
      title: true,
      description: true,
      image: true,
      privacyLevel: true,
      isPublic: true,
      startTime: true,
      endTime: true,
      venue: true,
      address: true,
      city: true,
      priceMin: true,
      priceMax: true,
      createdAt: true,
      users: { select: { name: true, username: true, avatar: true } },
      _count: { select: { content_participants: true } },
    }

    const [hangouts, events] = await Promise.all([
      db.content.findMany({
        where: { ...whereBase, type: 'HANGOUT' },
        select,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.content.findMany({
        where: { ...whereBase, type: 'EVENT' },
        select,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const normalize = (item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description ?? undefined,
      image: item.image ?? undefined,
      privacyLevel: item.privacyLevel,
      isPublic: item.isPublic,
      startTime: item.startTime ?? undefined,
      endTime: item.endTime ?? undefined,
      venue: item.venue ?? undefined,
      city: item.city ?? undefined,
      priceMin: item.priceMin ?? undefined,
      priceMax: item.priceMax ?? undefined,
      createdAt: item.createdAt,
      creator: {
        name: item.users?.name ?? 'Unknown',
        username: item.users?.username ?? 'unknown',
        avatar: item.users?.avatar ?? undefined,
      },
      _count: { participants: item._count?.content_participants ?? 0 },
    })

    return NextResponse.json({
      success: true,
      hangouts: hangouts.map(normalize),
      events: events.map(normalize),
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load public content' }, { status: 500 })
  }
}

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

