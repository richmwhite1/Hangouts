import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
// Get photos for moderation dashboard
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user has moderation permissions
    const user = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions for moderation dashboard'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { caption: { contains: search, mode: 'insensitive' } },
        { creator: { name: { contains: search, mode: 'insensitive' } } },
        { creator: { username: { contains: search, mode: 'insensitive' } } },
        { hangout: { title: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Get photos with pagination
    const [photos, totalCount] = await Promise.all([
      db.photo.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          hangout: {
            select: {
              id: true,
              title: true
            }
          },
          _count: {
            select: {
              moderations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.photo.count({ where })
    ])

    // Get moderation statistics
    const stats = await db.photo.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: photos,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        total: totalCount,
        ...statusCounts
      }
    })

  } catch (error) {
    logger.error('Get moderation photos error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photos for moderation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}






























