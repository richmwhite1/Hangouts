import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
// Albums API for photo organization
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const isPublic = searchParams.get('isPublic')

    // Build query conditions
    const where: any = {
      creatorId: user.id
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    // Get albums with pagination
    const albums = await db.album.findMany({
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
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            smallUrl: true,
            mediumUrl: true,
            originalUrl: true
          }
        },
        photos: {
          select: {
            id: true,
            thumbnailUrl: true,
            smallUrl: true,
            mediumUrl: true,
            originalUrl: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 4 // Show first 4 photos
        },
        _count: {
          select: {
            photos: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await db.album.count({ where })
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        albums,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    logger.error('Get albums error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch albums',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const data = await request.json()
    const { name, description, isPublic = false, coverPhotoId } = data

    if (!name || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Album name is required'
      }, { status: 400 })
    }

    // Create album
    const album = await db.album.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic,
        coverPhotoId: coverPhotoId || null,
        creatorId: user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            smallUrl: true,
            mediumUrl: true,
            originalUrl: true
          }
        },
        _count: {
          select: {
            photos: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: album,
      message: 'Album created successfully'
    }, { status: 201 })

  } catch (error) {
    logger.error('Create album error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create album',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
































