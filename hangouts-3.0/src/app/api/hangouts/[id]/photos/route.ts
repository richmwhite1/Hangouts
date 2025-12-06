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
      return NextResponse.json(createErrorResponse('Bad Request', 'No photos provided'), { status: 400 });
    }

    // Validate file types and sizes
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/gif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'
    ];
    const maxSize = 20 * 1024 * 1024; // 20MB

    const uploadedPhotos = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
        logger.warn(`Skipping invalid file type: ${file.type}`);
        continue;
      }

      // Validate file size
      if (file.size > maxSize) {
        logger.warn(`Skipping file too large: ${file.size} bytes`);
        continue;
      }

      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Process image with Sharp
        let image = sharp(buffer);
        
        // Handle HEIC/HEIF formats
        if (file.type === 'image/heic' || file.type === 'image/heif') {
          image = image.heif();
        }

        const metadata = await image.metadata();
        const originalWidth = metadata.width || 0;
        const originalHeight = metadata.height || 0;

        // Create multiple sizes for responsive design
        const sizes = [
          { name: 'thumbnail', width: 150, height: 150 },
          { name: 'small', width: 400, height: 400 },
          { name: 'medium', width: 800, height: 800 },
          { name: 'large', width: 1200, height: 1200 },
          { name: 'original', width: originalWidth, height: originalHeight }
        ];

        const processedImages: { [key: string]: { buffer: Buffer; filename: string; dimensions: { width: number; height: number } } } = {};
        const baseFilename = `photo_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        for (const size of sizes) {
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
            const aspectRatio = originalWidth / originalHeight;
            let width: number, height: number;

            if (aspectRatio > 1) {
              // Landscape
              width = Math.min(size.width, originalWidth);
              height = Math.round(width / aspectRatio);
            } else {
              // Portrait or square
              height = Math.min(size.height, originalHeight);
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
        }

        // Create uploads directory structure
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'photos');
        await mkdir(uploadsDir, { recursive: true });

        // Save all processed images
        const savedFiles: { [key: string]: string } = {};
        for (const [sizeName, imageData] of Object.entries(processedImages)) {
          const filepath = join(uploadsDir, imageData.filename);
          await writeFile(filepath, imageData.buffer);
          savedFiles[sizeName] = `/uploads/photos/${imageData.filename}`;
        }

        // Create photo record
        const photo = await db.photos.create({
          data: {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangoutId,
            creatorId: userId,
            originalUrl: savedFiles.original,
            thumbnailUrl: savedFiles.thumbnail,
            smallUrl: savedFiles.small,
            mediumUrl: savedFiles.medium,
            largeUrl: savedFiles.large,
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            fileSize: processedImages.original.buffer.length,
            mimeType: 'image/webp',
            isPublic: true,
            caption: '',
            updatedAt: new Date()
          }
        });

        uploadedPhotos.push(photo);
      } catch (processingError: any) {
        logger.error('Error processing image:', processingError);
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