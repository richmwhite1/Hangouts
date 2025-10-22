import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// Get shared photo by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the photo share by token
    const photoShare = await db.photoShare.findUnique({
      where: { shareToken: token },
      include: {
        photo: {
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
            }
          }
        }
      }
    })

    if (!photoShare) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found or link is invalid'
      }, { status: 404 })
    }

    // Check if share has expired
    if (photoShare.expiresAt && new Date(photoShare.expiresAt) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'This photo link has expired'
      }, { status: 410 })
    }

    // Get collaboration data
    const [comments, likes, tags] = await Promise.all([
      db.photoComment.findMany({
        where: { photoId: photoShare.photoId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      db.photoLike.findMany({
        where: { photoId: photoShare.photoId },
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
      }),
      db.photoTag.findMany({
        where: { photoId: photoShare.photoId },
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
      })
    ])

    // Group reactions by type
    const reactions = likes.reduce((acc, like) => {
      if (!acc[like.reaction]) {
        acc[like.reaction] = []
      }
      acc[like.reaction].push(like.user)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      success: true,
      data: {
        id: photoShare.photo.id,
        originalUrl: photoShare.photo.originalUrl,
        thumbnailUrl: photoShare.photo.thumbnailUrl,
        caption: photoShare.photo.caption,
        isPublic: photoShare.photo.isPublic,
        createdAt: photoShare.photo.createdAt,
        creator: photoShare.photo.creator,
        hangout: photoShare.photo.hangout,
        share: {
          id: photoShare.id,
          message: photoShare.message,
          allowDownload: photoShare.allowDownload,
          allowComments: photoShare.allowComments,
          expiresAt: photoShare.expiresAt
        },
        stats: {
          totalComments: comments.length,
          totalLikes: likes.length,
          totalTags: tags.length
        },
        comments,
        reactions,
        tags
      }
    })

  } catch (error) {
    logger.error('Get shared photo error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load shared photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}































