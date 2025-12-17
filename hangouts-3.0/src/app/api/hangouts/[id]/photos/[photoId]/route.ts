import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClerkApiUser } from '@/lib/clerk-auth';
import { db } from '@/lib/db';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

// Helper function to check if user is host or cohost
async function checkHostPermissions(hangoutId: string, userId: string): Promise<boolean> {
  try {
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        content_participants: {
          where: {
            userId: userId
          }
        }
      }
    });

    if (!hangout) {
      logger.warn('Hangout not found in checkHostPermissions', { hangoutId, userId }, 'PHOTOS');
      return false;
    }

    // Check if user is creator
    if (hangout.creatorId === userId) {
      logger.debug('User is creator', { hangoutId, userId }, 'PHOTOS');
      return true;
    }

    // Check if user is cohost or has edit permissions
    const participant = hangout.content_participants[0];
    if (participant) {
      const hasPermission = participant.role === 'CO_HOST' || 
                           participant.role === 'CREATOR' || 
                           participant.isCoHost ||
                           participant.canEdit;
      logger.debug('Participant permission check', {
        hangoutId,
        userId,
        role: participant.role,
        isCoHost: participant.isCoHost,
        canEdit: participant.canEdit,
        hasPermission
      }, 'PHOTOS');
      return hasPermission;
    }

    logger.debug('User is not a participant', { hangoutId, userId }, 'PHOTOS');
    return false;
  } catch (error: any) {
    logger.error('Error checking host permissions:', {
      error: error.message,
      hangoutId,
      userId
    }, 'PHOTOS');
    return false;
  }
}

// DELETE a photo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: hangoutId, photoId } = await params;
    
    // Verify authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 });
    }

    const user = await getClerkApiUser();
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 });
    }

    const userId = user.id;

    // Check if hangout exists
    const hangout = await db.content.findUnique({
      where: { id: hangoutId }
    });

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Not Found', 'Hangout not found'), { status: 404 });
    }

    // Check if photo exists
    const photo = await db.photos.findUnique({
      where: { id: photoId }
    });

    if (!photo) {
      return NextResponse.json(createErrorResponse('Not Found', 'Photo not found'), { status: 404 });
    }

    // Check if photo belongs to this hangout
    if (photo.contentId !== hangoutId) {
      return NextResponse.json(createErrorResponse('Bad Request', 'Photo does not belong to this hangout'), { status: 400 });
    }

    // Check if user is host/cohost (only hosts/cohosts can delete any photo)
    const isHost = await checkHostPermissions(hangoutId, userId);
    if (!isHost) {
      // Regular participants can only delete their own photos
      if (photo.creatorId !== userId) {
        return NextResponse.json(createErrorResponse('Forbidden', 'Only hosts, cohosts, or the photo creator can delete photos'), { status: 403 });
      }
    }

    // Check if this photo is the primary photo
    const isPrimaryPhoto = hangout.image === photo.originalUrl || 
                          hangout.image === photo.thumbnailUrl ||
                          hangout.image === photo.smallUrl ||
                          hangout.image === photo.mediumUrl ||
                          hangout.image === photo.largeUrl;

    // Delete the photo
    await db.photos.delete({
      where: { id: photoId }
    });

    // If this was the primary photo, update hangout to use the next available photo
    if (isPrimaryPhoto) {
      const remainingPhotos = await db.photos.findMany({
        where: { contentId: hangoutId },
        orderBy: { createdAt: 'asc' },
        take: 1
      });

      if (remainingPhotos.length > 0) {
        // Set the first remaining photo as primary
        const newPrimaryPhoto = remainingPhotos[0];
        await db.content.update({
          where: { id: hangoutId },
          data: {
            image: newPrimaryPhoto.originalUrl || newPrimaryPhoto.thumbnailUrl || newPrimaryPhoto.smallUrl || newPrimaryPhoto.mediumUrl || newPrimaryPhoto.largeUrl
          }
        });
      } else {
        // No photos left, clear the primary image
        await db.content.update({
          where: { id: hangoutId },
          data: {
            image: null
          }
        });
      }
    }

    return NextResponse.json(createSuccessResponse({ message: 'Photo deleted successfully' }), { status: 200 });
  } catch (error: any) {
    logger.error('Error deleting photo:', error);
    return NextResponse.json(createErrorResponse('Internal Server Error', error.message || 'Failed to delete photo'), { status: 500 });
  }
}

// PATCH a photo (update caption or set as primary)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  let hangoutId: string = '';
  let photoId: string = '';
  
  try {
    const resolvedParams = await params;
    hangoutId = resolvedParams.id;
    photoId = resolvedParams.photoId;
    
    // Verify authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 });
    }

    const user = await getClerkApiUser();
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 });
    }

    const userId = user.id;

    // Check if hangout exists
    const hangout = await db.content.findUnique({
      where: { id: hangoutId }
    });

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Not Found', 'Hangout not found'), { status: 404 });
    }

    // Check if photo exists
    const photo = await db.photos.findUnique({
      where: { id: photoId }
    });

    if (!photo) {
      return NextResponse.json(createErrorResponse('Not Found', 'Photo not found'), { status: 404 });
    }

    // Check if photo belongs to this hangout
    if (photo.contentId !== hangoutId) {
      return NextResponse.json(createErrorResponse('Bad Request', 'Photo does not belong to this hangout'), { status: 400 });
    }

    const body = await request.json();
    const { caption, setAsPrimary } = body;

    // Check permissions based on action
    if (setAsPrimary) {
      // Only hosts/cohosts can set primary photo
      const isHost = await checkHostPermissions(hangoutId, userId);
      if (!isHost) {
        return NextResponse.json(createErrorResponse('Forbidden', 'Only hosts and cohosts can set primary photo'), { status: 403 });
      }
    } else if (caption !== undefined) {
      // Regular participants can update their own photo captions, hosts/cohosts can update any
      const isHost = await checkHostPermissions(hangoutId, userId);
      if (!isHost && photo.creatorId !== userId) {
        return NextResponse.json(createErrorResponse('Forbidden', 'Only hosts, cohosts, or the photo creator can update captions'), { status: 403 });
      }
    }

    // Update photo caption if provided
    if (caption !== undefined) {
      await db.photos.update({
        where: { id: photoId },
        data: {
          caption: caption || '',
          updatedAt: new Date()
        }
      });
    }

    // Set as primary photo if requested
    if (setAsPrimary) {
      const photoUrl = photo.originalUrl || photo.thumbnailUrl || photo.smallUrl || photo.mediumUrl || photo.largeUrl;
      
      if (!photoUrl) {
        logger.error('Cannot set primary photo: No valid URL found', {
          photoId,
          hangoutId,
          photo: {
            originalUrl: photo.originalUrl,
            thumbnailUrl: photo.thumbnailUrl,
            smallUrl: photo.smallUrl,
            mediumUrl: photo.mediumUrl,
            largeUrl: photo.largeUrl
          }
        }, 'PHOTOS');
        return NextResponse.json(
          createErrorResponse('Bad Request', 'Photo has no valid URL to set as primary'), 
          { status: 400 }
        );
      }

      try {
        await db.content.update({
          where: { id: hangoutId },
          data: {
            image: photoUrl
          }
        });
        logger.info('Primary photo updated successfully', {
          hangoutId,
          photoId,
          photoUrl
        }, 'PHOTOS');
      } catch (updateError: any) {
        logger.error('Error updating primary photo in database:', {
          error: updateError.message,
          stack: updateError.stack,
          hangoutId,
          photoId
        }, 'PHOTOS');
        throw new Error(`Failed to update primary photo: ${updateError.message || 'Database error'}`);
      }
    }

    return NextResponse.json(createSuccessResponse({ message: 'Photo updated successfully' }), { status: 200 });
  } catch (error: any) {
    logger.error('Error updating photo:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      hangoutId,
      photoId
    }, 'PHOTOS');
    return NextResponse.json(
      createErrorResponse('Internal Server Error', error.message || 'Failed to update photo'), 
      { status: 500 }
    );
  }
}
