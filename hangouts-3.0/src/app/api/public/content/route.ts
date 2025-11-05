import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = (searchParams.get('type') || '').toUpperCase()
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereBase: any = {
      OR: [
        { isPublic: true },
        { privacyLevel: 'PUBLIC' }
      ]
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
        { location: { contains: search, mode: 'insensitive' } },
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
      location: true,
      priceMin: true,
      priceMax: true,
      createdAt: true,
      users: { select: { name: true, username: true, avatar: true } },
      _count: { select: { content_participants: true } },
    }

    const [hangouts, events, totalHangouts, totalEvents] = await Promise.all([
      db.content.findMany({
        where: { ...whereBase, type: 'HANGOUT' },
        select,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.content.findMany({
        where: { ...whereBase, type: 'EVENT' },
        select,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.content.count({ where: { ...whereBase, type: 'HANGOUT' } }),
      db.content.count({ where: { ...whereBase, type: 'EVENT' } }),
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
      location: item.location ?? undefined,
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
      total: totalHangouts + totalEvents,
      hasMore: hangouts.length + events.length < totalHangouts + totalEvents,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load public content' }, { status: 500 })
  }
}

