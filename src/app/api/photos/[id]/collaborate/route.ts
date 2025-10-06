import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Photo collaboration API (comments, reactions, etc.)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params
    
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

    const { action, content, x, y, tagUserId } = await request.json()

    // Verify photo exists and user has access
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      include: {
        creator: true,
        shares: {
          where: {
            OR: [
              { userId: payload.userId },
              { shareType: 'PUBLIC' }
            ]
          }
        }
      }
    })

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 })
    }

    // Check if user has access to the photo
    const hasAccess = photo.creatorId === payload.userId || 
                     photo.isPublic || 
                     photo.shares.length > 0

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'You do not have access to this photo'
      }, { status: 403 })
    }

    switch (action) {
      case 'add_comment':
        return await addComment(photoId, payload.userId, content)
      
      case 'add_reaction':
        return await addReaction(photoId, payload.userId, content)
      
      case 'add_tag':
        return await addTag(photoId, payload.userId, tagUserId, x, y)
      
      case 'remove_tag':
        return await removeTag(photoId, payload.userId, tagUserId)
      
      case 'add_annotation':
        return await addAnnotation(photoId, payload.userId, content, x, y)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: add_comment, add_reaction, add_tag, remove_tag, add_annotation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Photo collaboration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to collaborate on photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function addComment(photoId: string, userId: string, content: string) {
  try {
    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Comment content is required'
      }, { status: 400 })
    }

    const comment = await db.photoComment.create({
      data: {
        photoId,
        userId,
        content: content.trim()
      },
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

    // Create notification for photo owner
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: { creatorId: true }
    })

    if (photo && photo.creatorId !== userId) {
      await db.notification.create({
        data: {
          userId: photo.creatorId,
          type: 'PHOTO_COMMENT',
          title: 'New Comment',
          message: `Someone commented on your photo`,
          data: {
            photoId,
            commentId: comment.id
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { comment },
      message: 'Comment added successfully'
    })

  } catch (error) {
    console.error('Add comment error:', error)
    throw error
  }
}

async function addReaction(photoId: string, userId: string, reaction: string) {
  try {
    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
    
    if (!validReactions.includes(reaction)) {
      return NextResponse.json({
        success: false,
        error: `Invalid reaction. Valid reactions: ${validReactions.join(', ')}`
      }, { status: 400 })
    }

    // Check if user already reacted
    const existingReaction = await db.photoLike.findFirst({
      where: {
        photoId,
        userId
      }
    })

    if (existingReaction) {
      // Update existing reaction
      const updatedReaction = await db.photoLike.update({
        where: { id: existingReaction.id },
        data: { reaction }
      })

      return NextResponse.json({
        success: true,
        data: { reaction: updatedReaction },
        message: 'Reaction updated successfully'
      })
    } else {
      // Create new reaction
      const newReaction = await db.photoLike.create({
        data: {
          photoId,
          userId,
          reaction
        }
      })

      // Create notification for photo owner
      const photo = await db.photo.findUnique({
        where: { id: photoId },
        select: { creatorId: true }
      })

      if (photo && photo.creatorId !== userId) {
        await db.notification.create({
          data: {
            userId: photo.creatorId,
            type: 'PHOTO_LIKE',
            title: 'Photo Reaction',
            message: `Someone reacted to your photo`,
            data: {
              photoId,
              reaction
            }
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: { reaction: newReaction },
        message: 'Reaction added successfully'
      })
    }

  } catch (error) {
    console.error('Add reaction error:', error)
    throw error
  }
}

async function addTag(photoId: string, userId: string, tagUserId: string, x: number, y: number) {
  try {
    // Verify the user being tagged exists
    const taggedUser = await db.user.findUnique({
      where: { id: tagUserId },
      select: { id: true, name: true, username: true }
    })

    if (!taggedUser) {
      return NextResponse.json({
        success: false,
        error: 'User to tag not found'
      }, { status: 404 })
    }

    // Check if user already tagged in this photo
    const existingTag = await db.photoTag.findFirst({
      where: {
        photoId,
        userId: tagUserId
      }
    })

    if (existingTag) {
      return NextResponse.json({
        success: false,
        error: 'User is already tagged in this photo'
      }, { status: 400 })
    }

    const tag = await db.photoTag.create({
      data: {
        photoId,
        userId: tagUserId,
        creatorId: userId,
        x: x || 0,
        y: y || 0
      },
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

    // Create notification for tagged user
    await db.notification.create({
      data: {
        userId: tagUserId,
        type: 'PHOTO_TAG',
        title: 'You were tagged',
        message: `You were tagged in a photo`,
        data: {
          photoId,
          tagId: tag.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { tag },
      message: 'User tagged successfully'
    })

  } catch (error) {
    console.error('Add tag error:', error)
    throw error
  }
}

async function removeTag(photoId: string, userId: string, tagUserId: string) {
  try {
    // Find the tag
    const tag = await db.photoTag.findFirst({
      where: {
        photoId,
        userId: tagUserId
      }
    })

    if (!tag) {
      return NextResponse.json({
        success: false,
        error: 'Tag not found'
      }, { status: 404 })
    }

    // Check if user can remove the tag (creator of photo or tag creator)
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: { creatorId: true }
    })

    if (photo?.creatorId !== userId && tag.creatorId !== userId) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to remove this tag'
      }, { status: 403 })
    }

    await db.photoTag.delete({
      where: { id: tag.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Tag removed successfully'
    })

  } catch (error) {
    console.error('Remove tag error:', error)
    throw error
  }
}

async function addAnnotation(photoId: string, userId: string, content: string, x: number, y: number) {
  try {
    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Annotation content is required'
      }, { status: 400 })
    }

    // For now, we'll store annotations as comments with position data
    // In a real app, you might want a separate PhotoAnnotation model
    const annotation = await db.photoComment.create({
      data: {
        photoId,
        userId,
        content: content.trim(),
        // Store position in metadata (you'd need to add this field to the schema)
        // For now, we'll prepend position info to the content
        content: `[${x},${y}] ${content.trim()}`
      },
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

    return NextResponse.json({
      success: true,
      data: { annotation },
      message: 'Annotation added successfully'
    })

  } catch (error) {
    console.error('Add annotation error:', error)
    throw error
  }
}

// Get collaboration data for a photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params
    
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

    // Get photo collaboration data
    const [comments, likes, tags] = await Promise.all([
      db.photoComment.findMany({
        where: { photoId },
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
        where: { photoId },
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
        where: { photoId },
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
        comments,
        reactions,
        tags,
        stats: {
          totalComments: comments.length,
          totalLikes: likes.length,
          totalTags: tags.length
        }
      }
    })

  } catch (error) {
    console.error('Get photo collaboration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get collaboration data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
















