import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClerkApiUser } from '@/lib/clerk-auth';
import { db } from '@/lib/db';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { logger } from '@/lib/logger'
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params;
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
        
        // Create uploads directory structure
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'photos');
        await mkdir(uploadsDir, { recursive: true });

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

            // Save all processed images
            for (const [sizeName, imageData] of Object.entries(processedImages)) {
              try {
                const filepath = join(uploadsDir, imageData.filename);
                await writeFile(filepath, imageData.buffer);
                savedFiles[sizeName] = `/uploads/photos/${imageData.filename}`;
              } catch (writeError: any) {
                logger.error(`Error saving ${sizeName}:`, writeError);
              }
            }

            // If we couldn't process any sizes, fall back to saving original
            if (Object.keys(savedFiles).length === 0) {
              throw new Error('Failed to process any image sizes');
            }

            finalMimeType = 'image/webp';
          } catch (sharpError: any) {
            // If Sharp processing fails, save the original file
            logger.warn('Sharp processing failed, saving original file:', sharpError);
            const fileExtension = file.name.split('.').pop() || 'bin';
            const originalFilename = `${baseFilename}_original.${fileExtension}`;
            const filepath = join(uploadsDir, originalFilename);
            await writeFile(filepath, buffer);
            savedFiles.original = `/uploads/photos/${originalFilename}`;
            savedFiles.thumbnail = savedFiles.original;
            savedFiles.small = savedFiles.original;
            savedFiles.medium = savedFiles.original;
            savedFiles.large = savedFiles.original;
            finalMimeType = file.type || 'application/octet-stream';
          }
        } else {
          // For non-image files, save directly
          const fileExtension = file.name.split('.').pop() || 'bin';
          const originalFilename = `${baseFilename}_original.${fileExtension}`;
          const filepath = join(uploadsDir, originalFilename);
          await writeFile(filepath, buffer);
          savedFiles.original = `/uploads/photos/${originalFilename}`;
          savedFiles.thumbnail = savedFiles.original;
          savedFiles.small = savedFiles.original;
          savedFiles.medium = savedFiles.original;
          savedFiles.large = savedFiles.original;
        }

        // Create photo record
        const photo = await db.photos.create({
          data: {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangoutId,
            creatorId: userId,
            originalUrl: savedFiles.original || savedFiles.large || savedFiles.medium || savedFiles.small,
            thumbnailUrl: savedFiles.thumbnail || savedFiles.small || savedFiles.original,
            smallUrl: savedFiles.small || savedFiles.medium || savedFiles.original,
            mediumUrl: savedFiles.medium || savedFiles.large || savedFiles.original,
            largeUrl: savedFiles.large || savedFiles.original,
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            fileSize: buffer.length,
            mimeType: finalMimeType,
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
          stack: processingError.stack
        });
        // Continue with next file instead of failing entire request
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
    logger.error('Error uploading photos:', error);
    return NextResponse.json(createErrorResponse('Internal Server Error', error.message || 'Failed to upload photos'), { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params;
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

    const photos = await db.photos.findMany({
      where: { contentId: hangoutId }, // Use contentId instead of hangoutId
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

    return NextResponse.json(createSuccessResponse({ photos }), { status: 200 });
  } catch (error: any) {
    logger.error('Error fetching photos:', error);
    return NextResponse.json(createErrorResponse('Internal Server Error', error.message || 'Failed to fetch photos'), { status: 500 });
  }
}