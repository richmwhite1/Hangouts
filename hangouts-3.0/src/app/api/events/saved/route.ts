import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClerkApiUser } from '@/lib/clerk-auth';
import { db } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'Authentication required'),
        { status: 401 }
      );
    }

    const clerkUser = await getClerkApiUser();
    if (!clerkUser) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'User not found'),
        { status: 401 }
      );
    }

    const userId = clerkUser.id;

    // Fetch user's saved/interested events
    const savedEvents = await db.content.findMany({
      where: {
        type: 'EVENT',
        eventSaves: {
          some: {
            userId,
          },
        },
        startTime: {
          gte: new Date(), // Only future events
        },
        status: 'ACTIVE',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        eventTags: {
          select: {
            tag: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Format the events to match the expected structure
    const formattedEvents = savedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      address: event.address,
      city: event.city,
      startDate: event.startTime?.toISOString(),
      startTime: event.startTime ? event.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined,
      price: event.priceMin !== null && event.priceMin !== undefined ? {
        min: event.priceMin,
        max: event.priceMax || undefined,
        currency: event.currency || 'USD',
      } : undefined,
      coverImage: event.image,
      creator: event.creator,
      tags: event.eventTags.map((tag) => tag.tag),
    }));

    return NextResponse.json(
      createSuccessResponse(formattedEvents, `Found ${formattedEvents.length} saved events`)
    );
  } catch (error: any) {
    logger.error('Error fetching saved events:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch saved events', error.message),
      { status: 500 }
    );
  }
}

