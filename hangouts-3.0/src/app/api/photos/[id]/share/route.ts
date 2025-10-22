import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
// Photo sharing and collaboration API
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

    const { action, userIds, groupIds, message, expiresAt, allowDownload, allowComments } = await request.json()

    // Verify photo exists and user has permission
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

    if (photo.creatorId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to share this photo'
      }, { status: 403 })
    }

    switch (action) {
      case 'share-with_users':
        return await shareWithUsers(photoId, userIds, message, expiresAt, allowDownload, allowComments)
      
      case 'share_with_groups':
        return await shareWithGroups(photoId, groupIds, message, expiresAt, allowDownload, allowComments)
      
      case 'create_public_link':
        return await createPublicLink(photoId, message, expiresAt, allowDownload, allowComments)
      
      case 'revoke_access':
        return await revokeAccess(photoId, userIds, groupIds)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: share_with_users, share_with_groups, create_public_link, revoke_access'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Photo share error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to share photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function shareWithUsers(
  photoId: string,
  userIds: string[],
  message: string,
  expiresAt: Date | null,
  allowDownload: boolean,
  allowComments: boolean
) {
  try {
    // Create photo shares for individual users
    const shares = await Promise.all(
      userIds.map(userId =>
        db.photoShare.create({
          data: {
            photoId,
            userId,
            message: message || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            allowDownload,
            allowComments,
            shareType: 'USER'
          }
        })
      )
    )

    // Create notifications for shared users
    await Promise.all(
      userIds.map(userId =>
        db.notification.create({
          data: {
            userId,
            type: 'PHOTO_SHARED',
            title: 'Photo Shared',
            message: `You have been shared a photo`,
            data: {
              photoId,
              shareType: 'USER'
            }
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: { shares },
      message: `Photo shared with ${userIds.length} user${userIds.length !== 1 ? 's' : ''}`
    })

  } catch (error) {
    logger.error('Share with users error:', error);
    throw error
  }
}

async function shareWithGroups(
  photoId: string,
  groupIds: string[],
  message: string,
  expiresAt: Date | null,
  allowDownload: boolean,
  allowComments: boolean
) {
  try {
    // Get all members of the groups
    const groupMembers = await db.groupMember.findMany({
      where: {
        groupId: { in: groupIds }
      },
      select: {
        userId: true,
        group: {
          select: {
            name: true
          }
        }
      }
    })

    const userIds = [...new Set(groupMembers.map(member => member.userId))]

    // Create photo shares for group members
    const shares = await Promise.all(
      userIds.map(userId =>
        db.photoShare.create({
          data: {
            photoId,
            userId,
            message: message || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            allowDownload,
            allowComments,
            shareType: 'GROUP'
          }
        })
      )
    )

    // Create notifications for group members
    await Promise.all(
      userIds.map(userId =>
        db.notification.create({
          data: {
            userId,
            type: 'PHOTO_SHARED',
            title: 'Photo Shared',
            message: `A photo has been shared in a group you're part of`,
            data: {
              photoId,
              shareType: 'GROUP'
            }
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: { shares },
      message: `Photo shared with ${groupIds.length} group${groupIds.length !== 1 ? 's' : ''}`
    })

  } catch (error) {
    logger.error('Share with groups error:', error);
    throw error
  }
}

async function createPublicLink(
  photoId: string,
  message: string,
  expiresAt: Date | null,
  allowDownload: boolean,
  allowComments: boolean
) {
  try {
    // Generate a unique share token
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Create public share
    const share = await db.photoShare.create({
      data: {
        photoId,
        shareToken,
        message: message || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowDownload,
        allowComments,
        shareType: 'PUBLIC'
      }
    })

    // Make photo public
    await db.photo.update({
      where: { id: photoId },
      data: { isPublic: true }
    })

    const publicUrl = `${process.env.NEXTAUTH_URL}/shared/photo/${shareToken}`

    return NextResponse.json({
      success: true,
      data: { 
        share,
        publicUrl,
        shareToken
      },
      message: 'Public link created successfully'
    })

  } catch (error) {
    logger.error('Create public link error:', error);
    throw error
  }
}

async function revokeAccess(
  photoId: string,
  userIds: string[],
  groupIds: string[]
) {
  try {
    const whereConditions: any[] = [{ photoId }]

    if (userIds.length > 0) {
      whereConditions.push({ userId: { in: userIds } })
    }

    if (groupIds.length > 0) {
      whereConditions.push({ shareType: 'GROUP' })
    }

    // Delete photo shares
    const deletedShares = await db.photoShare.deleteMany({
      where: {
        OR: whereConditions
      }
    })

    return NextResponse.json({
      success: true,
      data: { deletedCount: deletedShares.count },
      message: 'Access revoked successfully'
    })

  } catch (error) {
    logger.error('Revoke access error:', error);
    throw error
  }
}

// Get sharing information for a photo
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

    // Get photo shares
    const shares = await db.photoShare.findMany({
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

    // Get photo details
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        isPublic: true,
        creatorId: true
      }
    })

    if (!photo) {
      return NextResponse.json({
        success: false,
        error: 'Photo not found'
      }, { status: 404 })
    }

    if (photo.creatorId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to view sharing information for this photo'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        photo: {
          id: photo.id,
          isPublic: photo.isPublic
        },
        shares: shares.map(share => ({
          id: share.id,
          shareType: share.shareType,
          shareToken: share.shareToken,
          message: share.message,
          expiresAt: share.expiresAt,
          allowDownload: share.allowDownload,
          allowComments: share.allowComments,
          createdAt: share.createdAt,
          user: share.user
        }))
      }
    })

  } catch (error) {
    logger.error('Get photo shares error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get sharing information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}






























