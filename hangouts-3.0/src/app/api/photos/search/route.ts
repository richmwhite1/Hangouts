import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

// Advanced photo search and filtering API
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
    const query = searchParams.get('q') || ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const hangoutId = searchParams.get('hangoutId')
    const albumId = searchParams.get('albumId')
    const isPublic = searchParams.get('isPublic')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build complex search query
    const where: any = {
      creatorId: user.id
    }

    // Text search across caption and tags
    if (query) {
      where.OR = [
        {
          caption: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            some: {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        }
      ]
    }

    // Tag filtering
    if (tags.length > 0) {
      where.tags = {
        some: {
          name: {
            in: tags
          }
        }
      }
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Hangout filtering
    if (hangoutId) {
      where.hangoutId = hangoutId
    }

    // Album filtering
    if (albumId) {
      where.albumId = albumId
    }

    // Privacy filtering
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    // Get photos with advanced filtering
    const photos = await db.photo.findMany({
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
        album: {
          select: {
            id: true,
            name: true
          }
        },
        tags: true,
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await db.photo.count({ where })
    const totalPages = Math.ceil(totalCount / limit)

    // Get popular tags for suggestions
    const popularTags = await db.photoTag.groupBy({
      by: ['name'],
      where: {
        creatorId: user.id
      },
      _count: {
        name: true
      },
      orderBy: {
        _count: {
          name: 'desc'
        }
      },
      take: 10
    })

    // Get recent searches (stored in user preferences)
    const userPreferences = await db.userPreference.findUnique({
      where: { userId: user.id }
    })

    const recentSearches = userPreferences?.recentSearches as string[] || []

    return NextResponse.json({
      success: true,
      data: {
        photos,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        suggestions: {
          popularTags: popularTags.map(tag => ({
            name: tag.name,
            count: tag._count.name
          })),
          recentSearches
        }
      }
    })

  } catch (error) {
    console.error('Photo search error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to search photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Save search query to user preferences
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

    const { searchQuery } = await request.json()

    if (!searchQuery || typeof searchQuery !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Search query is required'
      }, { status: 400 })
    }

    // Get or create user preferences
    let userPreferences = await db.userPreference.findUnique({
      where: { userId: user.id }
    })

    if (!userPreferences) {
      userPreferences = await db.userPreference.create({
        data: {
          userId: user.id,
          recentSearches: [searchQuery]
        }
      })
    } else {
      // Update recent searches
      const recentSearches = (userPreferences.recentSearches as string[]) || []
      const updatedSearches = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, 10) // Keep only last 10 searches

      await db.userPreference.update({
        where: { userId: user.id },
        data: {
          recentSearches: updatedSearches
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Search query saved'
    })

  } catch (error) {
    console.error('Save search error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save search query',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}



















