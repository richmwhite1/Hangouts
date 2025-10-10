import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 });
    }

    const userId = payload.userId;

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
        userId: userId,
      },
    });

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
          joinedAt: new Date(),
        },
      });
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (files.length === 0) {
      return NextResponse.json(createErrorResponse('Bad Request', 'No photos provided'), { status: 400 });
    }

    const uploadedPhotos = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Convert file to base64 for storage (in production, use cloud storage)
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      // Create photo record
      const photo = await db.photos.create({
        data: {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangoutId, // Use contentId instead of hangoutId
          creatorId: userId,
          originalUrl: dataUrl,
          thumbnailUrl: dataUrl, // In production, create actual thumbnails
          smallUrl: dataUrl,
          mediumUrl: dataUrl,
          largeUrl: dataUrl,
          originalWidth: 1200, // Default values
          originalHeight: 1200,
          fileSize: file.size,
          mimeType: file.type,
          isPublic: true,
          caption: '',
          updatedAt: new Date(),
        },
      });

      uploadedPhotos.push(photo);
    }

    return NextResponse.json(createSuccessResponse({ photos: uploadedPhotos }), { status: 201 });
  } catch (error: any) {
    console.error('Error uploading photos:', error);
    return NextResponse.json(createErrorResponse('Internal Server Error', error.message || 'Failed to upload photos'), { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 });
    }

    const userId = payload.userId;

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
        userId: userId,
      },
    });

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
          joinedAt: new Date(),
        },
      });
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
    console.error('Error fetching photos:', error);
    return NextResponse.json(createErrorResponse('Internal Server Error', error.message || 'Failed to fetch photos'), { status: 500 });
  }
}