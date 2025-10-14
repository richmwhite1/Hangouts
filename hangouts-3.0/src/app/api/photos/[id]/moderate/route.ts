import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
// Photo moderation API
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

    const { action, reason, severity, notes } = await request.json()

    // Verify photo exists
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true
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

    // Check if user has moderation permissions
    const user = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions for moderation'
      }, { status: 403 })
    }

    switch (action) {
      case 'flag':
        return await flagPhoto(photoId, user.id, reason, severity, notes)
      
      case 'approve':
        return await approvePhoto(photoId, user.id, notes)
      
      case 'reject':
        return await rejectPhoto(photoId, user.id, reason, severity, notes)
      
      case 'hide':
        return await hidePhoto(photoId, user.id, reason, notes)
      
      case 'delete':
        return await deletePhoto(photoId, user.id, reason, notes)
      
      case 'restore':
        return await restorePhoto(photoId, user.id, notes)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: flag, approve, reject, hide, delete, restore'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Photo moderation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to moderate photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function flagPhoto(
  photoId: string,
  moderatorId: string,
  reason: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  notes: string
) {
  try {
    // Create moderation record
    const moderation = await db.photoModeration.create({
      data: {
        photoId,
        moderatorId,
        action: 'FLAGGED',
        reason,
        severity,
        notes: notes || null
      }
    })

    // Update photo status
    await db.photo.update({
      where: { id: photoId },
      data: { 
        status: 'FLAGGED',
        moderatedAt: new Date(),
        moderatedBy: moderatorId
      }
    })

    // Create notification for photo owner
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: { creatorId: true }
    })

    if (photo) {
      await db.notification.create({
        data: {
          userId: photo.creatorId,
          type: 'PHOTO_FLAGGED',
          title: 'Photo Flagged',
          message: `Your photo has been flagged for review: ${reason}`,
          data: {
            photoId,
            moderationId: moderation.id
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { moderation },
      message: 'Photo flagged successfully'
    })

  } catch (error) {
    logger.error('Flag photo error:', error);
    throw error
  }
}

async function approvePhoto(
  photoId: string,
  moderatorId: string,
  notes: string
) {
  try {
    // Create moderation record
    const moderation = await db.photoModeration.create({
      data: {
        photoId,
        moderatorId,
        action: 'APPROVED',
        reason: 'Content approved',
        severity: 'LOW',
        notes: notes || null
      }
    })

    // Update photo status
    await db.photo.update({
      where: { id: photoId },
      data: { 
        status: 'APPROVED',
        moderatedAt: new Date(),
        moderatedBy: moderatorId
      }
    })

    return NextResponse.json({
      success: true,
      data: { moderation },
      message: 'Photo approved successfully'
    })

  } catch (error) {
    logger.error('Approve photo error:', error);
    throw error
  }
}

async function rejectPhoto(
  photoId: string,
  moderatorId: string,
  reason: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  notes: string
) {
  try {
    // Create moderation record
    const moderation = await db.photoModeration.create({
      data: {
        photoId,
        moderatorId,
        action: 'REJECTED',
        reason,
        severity,
        notes: notes || null
      }
    })

    // Update photo status
    await db.photo.update({
      where: { id: photoId },
      data: { 
        status: 'REJECTED',
        moderatedAt: new Date(),
        moderatedBy: moderatorId
      }
    })

    // Create notification for photo owner
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: { creatorId: true }
    })

    if (photo) {
      await db.notification.create({
        data: {
          userId: photo.creatorId,
          type: 'PHOTO_REJECTED',
          title: 'Photo Rejected',
          message: `Your photo was rejected: ${reason}`,
          data: {
            photoId,
            moderationId: moderation.id
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { moderation },
      message: 'Photo rejected successfully'
    })

  } catch (error) {
    logger.error('Reject photo error:', error);
    throw error
  }
}

async function hidePhoto(
  photoId: string,
  moderatorId: string,
  reason: string,
  notes: string
) {
  try {
    // Create moderation record
    const moderation = await db.photoModeration.create({
      data: {
        photoId,
        moderatorId,
        action: 'HIDDEN',
        reason,
        severity: 'MEDIUM',
        notes: notes || null
      }
    })

    // Update photo status
    await db.photo.update({
      where: { id: photoId },
      data: { 
        status: 'HIDDEN',
        moderatedAt: new Date(),
        moderatedBy: moderatorId
      }
    })

    return NextResponse.json({
      success: true,
      data: { moderation },
      message: 'Photo hidden successfully'
    })

  } catch (error) {
    logger.error('Hide photo error:', error);
    throw error
  }
}

async function deletePhoto(
  photoId: string,
  moderatorId: string,
  reason: string,
  notes: string
) {
  try {
    // Create moderation record
    const moderation = await db.photoModeration.create({
      data: {
        photoId,
        moderatorId,
        action: 'DELETED',
        reason,
        severity: 'HIGH',
        notes: notes || null
      }
    })

    // Soft delete photo
    await db.photo.update({
      where: { id: photoId },
      data: { 
        status: 'DELETED',
        moderatedAt: new Date(),
        moderatedBy: moderatorId
      }
    })

    // Create notification for photo owner
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: { creatorId: true }
    })

    if (photo) {
      await db.notification.create({
        data: {
          userId: photo.creatorId,
          type: 'PHOTO_DELETED',
          title: 'Photo Deleted',
          message: `Your photo was deleted by moderators: ${reason}`,
          data: {
            photoId,
            moderationId: moderation.id
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { moderation },
      message: 'Photo deleted successfully'
    })

  } catch (error) {
    logger.error('Delete photo error:', error);
    throw error
  }
}

async function restorePhoto(
  photoId: string,
  moderatorId: string,
  notes: string
) {
  try {
    // Create moderation record
    const moderation = await db.photoModeration.create({
      data: {
        photoId,
        moderatorId,
        action: 'RESTORED',
        reason: 'Content restored',
        severity: 'LOW',
        notes: notes || null
      }
    })

    // Restore photo
    await db.photo.update({
      where: { id: photoId },
      data: { 
        status: 'APPROVED',
        moderatedAt: new Date(),
        moderatedBy: moderatorId
      }
    })

    return NextResponse.json({
      success: true,
      data: { moderation },
      message: 'Photo restored successfully'
    })

  } catch (error) {
    logger.error('Restore photo error:', error);
    throw error
  }
}

// Get moderation history for a photo
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

    // Check if user has moderation permissions
    const user = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to view moderation history'
      }, { status: 403 })
    }

    // Get moderation history
    const moderations = await db.photoModeration.findMany({
      where: { photoId },
      include: {
        moderator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: { moderations }
    })

  } catch (error) {
    logger.error('Get moderation history error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get moderation history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
























