import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClerkApiUser } from '@/lib/clerk-auth';
import { db } from '@/lib/db';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { uploadImage, validateCloudinaryConfig } from '@/lib/cloudinary';

import { logger } from '@/lib/logger'
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check Cloudinary configuration (non-blocking - log warning but don't fail)
    let cloudinaryConfigured = false;
    try {
      validateCloudinaryConfig();
      cloudinaryConfigured = true;
    } catch (validationError: any) {
      logger.warn('Cloudinary validation failed, uploads may not work', {
        error: validationError.message,
        nodeEnv: process.env.NODE_ENV
      }, 'PHOTOS');
      // Continue with request - will handle Cloudinary errors gracefully
    }

    const { id: hangoutId } = await params;
    logger.debug('Photo upload request', { hangoutId, cloudinaryConfigured }, 'PHOTOS');

    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 });
    }

    const user = await getClerkApiUser();
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 });
    }

    const userId = user.id;

    // Check if hangout exists and get its details
    const hangout = await db.content.findUnique({
      where: { id: hangoutId }
    });

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Not Found', 'Hangout not found'), { status: 404 });
    }

    // Check if user is a participant, if not, add them as a participant
    let participant = await db.content_participants.findFirst({
      where: {
        contentId: hangoutId,
        userId: userId}});

    if (!participant) {
      // Add user as a participant automatically
      participant = await db.content_participants.create({
        data: {
          id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangoutId,
          userId: userId,
          role: 'MEMBER',
          canEdit: false,
          isMandatory: false,
          isCoHost: false,
          joinedAt: new Date()}});
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (files.length === 0) {
      return NextResponse.json(createErrorResponse('Bad Request', 'No files provided'), { status: 400 });
    }

    // Increased max size to accommodate various file types (50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB

    const uploadedPhotos = [];

    for (const file of files) {
      // Validate file size
      if (file.size > maxSize) {
        logger.warn(`Skipping file too large: ${file.size} bytes (max: ${maxSize})`);
        continue;
      }

      // Check if file is empty
      if (file.size === 0) {
        logger.warn(`Skipping empty file: ${file.name}`);
        continue;
      }

      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Check if file is an image
        const isImage = file.type.startsWith('image/');

        const baseFilename = `file_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let savedFiles: { [key: string]: string } = {};
        let originalWidth = 0;
        let originalHeight = 0;
        let finalMimeType = file.type || 'application/octet-stream';

        if (isImage) {
          // Process image with Sharp
          try {
            let image = sharp(buffer);
            
            // Handle HEIC/HEIF formats
            if (file.type === 'image/heic' || file.type === 'image/heif') {
              try {
                image = image.heif();
              } catch (heifError) {
                // If HEIC processing fails, try as regular image
                logger.warn('HEIC processing failed, trying as regular image:', heifError);
                image = sharp(buffer);
              }
            }

            const metadata = await image.metadata();
            originalWidth = metadata.width || 0;
            originalHeight = metadata.height || 0;

            // Create multiple sizes for responsive design
            const sizes = [
              { name: 'thumbnail', width: 150, height: 150 },
              { name: 'small', width: 400, height: 400 },
              { name: 'medium', width: 800, height: 800 },
              { name: 'large', width: 1200, height: 1200 },
              { name: 'original', width: originalWidth, height: originalHeight }
            ];

            const processedImages: { [key: string]: { buffer: Buffer; filename: string; dimensions: { width: number; height: number } } } = {};

            for (const size of sizes) {
              try {
                let processedBuffer: Buffer;
                let dimensions: { width: number; height: number };

                if (size.name === 'original') {
                  // Keep original dimensions but optimize to WebP
                  processedBuffer = await image
                    .webp({ 
                      quality: 90,
                      effort: 6,
                      lossless: false
                    })
                    .toBuffer();
                  dimensions = { width: originalWidth, height: originalHeight };
                } else {
                  // Resize to specific dimensions
                  const aspectRatio = originalHeight > 0 ? originalWidth / originalHeight : 1;
                  let width: number, height: number;

                  if (aspectRatio > 1) {
                    // Landscape
                    width = Math.min(size.width, originalWidth || size.width);
                    height = Math.round(width / aspectRatio);
                  } else {
                    // Portrait or square
                    height = Math.min(size.height, originalHeight || size.height);
                    width = Math.round(height * aspectRatio);
                  }

                  processedBuffer = await image
                    .clone()
                    .resize(width, height, { 
                      fit: 'cover', 
                      position: 'center',
                      withoutEnlargement: true
                    })
                    .webp({ 
                      quality: size.name === 'thumbnail' ? 80 : 85,
                      effort: 6,
                      lossless: false
                    })
                    .toBuffer();

                  dimensions = { width, height };
                }

                const filename = `${baseFilename}_${size.name}.webp`;
                processedImages[size.name] = {
                  buffer: processedBuffer,
                  filename,
                  dimensions
                };
              } catch (sizeError: any) {
                logger.error(`Error processing ${size.name} size:`, sizeError);
                // Continue with other sizes
              }
            }

            // Upload all processed images to Cloudinary
            for (const [sizeName, imageData] of Object.entries(processedImages)) {
              try {
                const cloudinaryResult = await uploadImage(
                  imageData.buffer,
                  `${baseFilename}_${sizeName}`,
                  'image/webp',
                  'hangouts/photos'
                );

                if (cloudinaryResult.success) {
                  savedFiles[sizeName] = cloudinaryResult.url;
                  logger.debug(`Uploaded ${sizeName} to Cloudinary`, {
                    sizeName,
                    url: cloudinaryResult.url,
                    publicId: cloudinaryResult.public_id
                  }, 'PHOTOS');
                } else {
                  logger.error(`Failed to upload ${sizeName} to Cloudinary:`, cloudinaryResult.error);
                }
              } catch (uploadError: any) {
                logger.error(`Error uploading ${sizeName} to Cloudinary:`, uploadError);
              }
            }

            // If we couldn't process any sizes, check if Cloudinary is configured
            if (Object.keys(savedFiles).length === 0) {
              const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                                         process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
                                         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';
              
              if (!hasCloudinaryConfig && process.env.NODE_ENV === 'production') {
                logger.error('Cloudinary not configured - cannot upload photos', {
                  hangoutId,
                  fileName: file.name
                }, 'PHOTOS');
                throw new Error('Photo upload service is not configured. Please contact support.');
              }
              throw new Error('Failed to process any image sizes');
            }

            finalMimeType = 'image/webp';
          } catch (sharpError: any) {
            // If Sharp processing fails, upload the original file to Cloudinary
            logger.warn('Sharp processing failed, uploading original file to Cloudinary:', sharpError);
            try {
              const cloudinaryResult = await uploadImage(
                buffer,
                `${baseFilename}_original`,
                file.type || 'application/octet-stream',
                'hangouts/photos'
              );

              if (cloudinaryResult.success) {
                savedFiles.original = cloudinaryResult.url;
                savedFiles.thumbnail = cloudinaryResult.url;
                savedFiles.small = cloudinaryResult.url;
                savedFiles.medium = cloudinaryResult.url;
                savedFiles.large = cloudinaryResult.url;
                logger.debug('Uploaded original file to Cloudinary as fallback', {
                  url: cloudinaryResult.url,
                  publicId: cloudinaryResult.public_id
                }, 'PHOTOS');
              } else {
                logger.error('Failed to upload original file to Cloudinary:', cloudinaryResult.error);
                const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                                           process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
                                           process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';
                if (!hasCloudinaryConfig && process.env.NODE_ENV === 'production') {
                  throw new Error('Photo upload service is not configured. Please contact support.');
                }
                throw new Error(`Failed to upload file: ${cloudinaryResult.error || 'Unknown error'}`);
              }
            } catch (cloudinaryError: any) {
              logger.error('Cloudinary upload failed for original file:', cloudinaryError);
              const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                                         process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
                                         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';
              if (!hasCloudinaryConfig && process.env.NODE_ENV === 'production') {
                throw new Error('Photo upload service is not configured. Please contact support.');
              }
              throw new Error(`Image processing and upload failed: ${cloudinaryError.message || 'Unknown error'}`);
            }
            finalMimeType = file.type || 'application/octet-stream';
          }
        } else {
          // For non-image files, upload directly to Cloudinary
          try {
            const cloudinaryResult = await uploadImage(
              buffer,
              `${baseFilename}_original`,
              file.type || 'application/octet-stream',
              'hangouts/photos'
            );

            if (cloudinaryResult.success) {
              savedFiles.original = cloudinaryResult.url;
              savedFiles.thumbnail = cloudinaryResult.url;
              savedFiles.small = cloudinaryResult.url;
              savedFiles.medium = cloudinaryResult.url;
              savedFiles.large = cloudinaryResult.url;
              logger.debug('Uploaded non-image file to Cloudinary', {
                url: cloudinaryResult.url,
                publicId: cloudinaryResult.public_id,
                mimeType: file.type
              }, 'PHOTOS');
            } else {
              logger.error('Failed to upload non-image file to Cloudinary:', cloudinaryResult.error);
              const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                                         process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
                                         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';
              if (!hasCloudinaryConfig && process.env.NODE_ENV === 'production') {
                throw new Error('Photo upload service is not configured. Please contact support.');
              }
              throw new Error(`Failed to upload file: ${cloudinaryResult.error || 'Unknown error'}`);
            }
          } catch (uploadError: any) {
            logger.error('Cloudinary upload failed for non-image file:', uploadError);
            const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                                       process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
                                       process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';
            if (!hasCloudinaryConfig && process.env.NODE_ENV === 'production') {
              throw new Error('Photo upload service is not configured. Please contact support.');
            }
            throw new Error(`File upload failed: ${uploadError.message || 'Unknown error'}`);
          }
        }

        // Validate that we have at least one URL before creating photo record
        const originalUrl = savedFiles.original || savedFiles.large || savedFiles.medium || savedFiles.small || savedFiles.thumbnail;
        if (!originalUrl) {
          logger.error('No URLs available after processing', {
            savedFiles,
            fileName: file.name,
            hangoutId
          }, 'PHOTOS');
          throw new Error('Failed to upload photo: No URLs generated after processing');
        }

        // Ensure all required URL fields have values (use originalUrl as fallback)
        const thumbnailUrl = savedFiles.thumbnail || savedFiles.small || savedFiles.medium || originalUrl;
        const smallUrl = savedFiles.small || savedFiles.medium || savedFiles.large || originalUrl;
        const mediumUrl = savedFiles.medium || savedFiles.large || originalUrl;
        const largeUrl = savedFiles.large || savedFiles.original || originalUrl;

        // Create photo record
        const photo = await db.photos.create({
          data: {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangoutId,
            creatorId: userId,
            originalUrl: originalUrl,
            thumbnailUrl: thumbnailUrl,
            smallUrl: smallUrl,
            mediumUrl: mediumUrl,
            largeUrl: largeUrl,
            originalWidth: originalWidth || 0,
            originalHeight: originalHeight || 0,
            fileSize: buffer.length,
            mimeType: finalMimeType || 'image/webp',
            isPublic: true,
            caption: '',
            updatedAt: new Date()
          }
        });

        uploadedPhotos.push(photo);
      } catch (processingError: any) {
        logger.error('Error processing file:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          error: processingError.message,
          stack: processingError.stack,
          hangoutId,
          userId
        }, 'PHOTOS');
        // Continue with next file instead of failing entire request
        // But log the error so we can debug
        continue;
      }
    }

    if (uploadedPhotos.length === 0) {
      return NextResponse.json(createErrorResponse('Bad Request', 'No valid photos were uploaded'), { status: 400 });
    }

    // Update content's updatedAt timestamp for recent activity sorting
    try {
      await db.content.update({
        where: { id: hangoutId },
        data: {
          updatedAt: new Date()
        }
      })
    } catch (error) {
      logger.error('Error updating content updatedAt:', error)
      // Don't fail the request if this update fails
    }

    return NextResponse.json(createSuccessResponse({ photos: uploadedPhotos }), { status: 201 });
  } catch (error: any) {
    logger.error('Error uploading photos:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    }, 'PHOTOS');
    return NextResponse.json(
      createErrorResponse('Internal Server Error', error.message || 'Failed to upload photos'), 
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let hangoutId: string;

  try {
    logger.debug('Photos GET request started', { url: request.url }, 'PHOTOS');

    // Extract hangout ID from params
    try {
      const resolvedParams = await params;
      hangoutId = resolvedParams.id;
      logger.debug('Params resolved', { hangoutId }, 'PHOTOS');
    } catch (paramsError: any) {
      logger.error('Error resolving params:', paramsError, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Invalid Request', 'Invalid hangout ID'), { status: 400 });
    }

    // Verify authentication using Clerk
    let clerkUserId: string | null;
    try {
      const authResult = await auth();
      clerkUserId = authResult.userId;
      logger.debug('Auth result', { hasUserId: !!clerkUserId }, 'PHOTOS');
    } catch (authError: any) {
      logger.error('Auth error:', authError, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Authentication Error', 'Failed to verify authentication'), { status: 401 });
    }

    if (!clerkUserId) {
      logger.warn('No authenticated user for photos request', { hangoutId }, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 });
    }

    // Get user from database
    let user: any;
    try {
      user = await getClerkApiUser();
      logger.debug('User lookup result', { hasUser: !!user, userId: user?.id }, 'PHOTOS');
    } catch (userError: any) {
      logger.error('Error fetching user:', userError, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Authentication Error', 'Failed to fetch user data'), { status: 401 });
    }

    if (!user) {
      logger.warn('No user found in database', { clerkUserId }, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 });
    }

    const userId = user.id;

    // Check if hangout exists and get its details
    let hangout: any;
    try {
      hangout = await db.content.findUnique({
        where: { id: hangoutId }
      });
      logger.debug('Hangout lookup result', { hangoutId, found: !!hangout }, 'PHOTOS');
    } catch (hangoutError: any) {
      logger.error('Error fetching hangout:', hangoutError, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Database Error', 'Failed to check hangout existence'), { status: 500 });
    }

    if (!hangout) {
      logger.warn('Hangout not found', { hangoutId, userId }, 'PHOTOS');
      return NextResponse.json(createErrorResponse('Not Found', 'Hangout not found'), { status: 404 });
    }

    // Check if user is a participant, if not, add them as a participant
    let participant: any;
    try {
      participant = await db.content_participants.findFirst({
        where: {
          contentId: hangoutId,
          userId: userId
        }
      });
      logger.debug('Participant check result', { hangoutId, userId, isParticipant: !!participant }, 'PHOTOS');
    } catch (participantError: any) {
      logger.error('Error checking participant:', participantError, 'PHOTOS');
      // Continue with the request even if participant check fails
    }

    if (!participant) {
      try {
        participant = await db.content_participants.create({
          data: {
            id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangoutId,
            userId: userId,
            role: 'MEMBER',
            canEdit: false,
            isMandatory: false,
            isCoHost: false,
            joinedAt: new Date()
          }
        });
        logger.debug('Created new participant', { hangoutId, userId, participantId: participant.id }, 'PHOTOS');
      } catch (createParticipantError: any) {
        logger.error('Error creating participant:', createParticipantError, 'PHOTOS');
        // Continue with the request even if participant creation fails
      }
    }

    // Fetch photos
    let photos: any[] = [];
    try {
      photos = await db.photos.findMany({
        where: { contentId: hangoutId },
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        }
      });
      logger.debug('Photos query successful', { hangoutId, photoCount: photos.length }, 'PHOTOS');
    } catch (photosError: any) {
      logger.error('Error fetching photos from database:', {
        hangoutId,
        error: photosError.message,
        stack: photosError.stack,
        name: photosError.name,
        code: photosError.code
      }, 'PHOTOS');
      
      // Try a simpler query without the include if the first one fails
      try {
        logger.debug('Retrying photos query without user relation', { hangoutId }, 'PHOTOS');
        photos = await db.photos.findMany({
          where: { contentId: hangoutId },
          orderBy: { createdAt: 'desc' }
        });
        logger.debug('Simple photos query successful', { hangoutId, photoCount: photos.length }, 'PHOTOS');
      } catch (retryError: any) {
        logger.error('Retry photos query also failed:', {
          hangoutId,
          error: retryError.message,
          stack: retryError.stack
        }, 'PHOTOS');
        // Return empty array instead of failing entirely
        photos = [];
      }
    }

    const response = createSuccessResponse({ photos });
    logger.debug('Photos GET request completed successfully', {
      hangoutId,
      photoCount: photos.length,
      userId
    }, 'PHOTOS');

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Unexpected error in photos GET endpoint:', {
      error: error.message,
      stack: error.stack,
      hangoutId: hangoutId || 'unknown',
      url: request.url
    }, 'PHOTOS');

    return NextResponse.json(
      createErrorResponse('Internal Server Error', error.message || 'Failed to fetch photos'),
      { status: 500 }
    );
  }
}