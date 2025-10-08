import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-handler'
import { HangoutQueries, TransactionQueries } from '@/lib/db-queries'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createHangoutFlow, HANGOUT_STATES } from '@/lib/hangout-flow'

const createHangoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  location: z.string().max(200, 'Location too long').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).default('PUBLIC'),
  maxParticipants: z.number().min(2, 'Must allow at least 2 participants').max(100, 'Too many participants').optional(),
  weatherEnabled: z.boolean().default(false),
  image: z.string().optional(),
  participants: z.array(z.string()).optional(), // Array of user IDs to invite
  mandatoryParticipants: z.array(z.string()).optional(), // Array of mandatory user IDs
  coHosts: z.array(z.string()).optional(), // Array of co-host user IDs
  consensusPercentage: z.number().min(50).max(100).optional().default(70), // Consensus percentage required
  
  // New flow-specific fields
  type: z.enum(['quick_plan', 'multi_option']).default('multi_option'),
  options: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Option title is required'),
    description: z.string().optional(),
    location: z.string().optional(),
    dateTime: z.string().optional(),
    price: z.number().optional(),
    hangoutUrl: z.string().optional()
  })).min(1, 'At least one option is required'),
})

async function getHangoutsHandler(request: AuthenticatedRequest) {
  const userId = request.user?.userId
  
  if (!userId) {
    return createErrorResponse('Authentication required', 'User ID not provided', 401)
  }

  try {
    // Check if this is a discover request
    const url = new URL(request.url)
    const discover = url.searchParams.get('discover') === 'true'
    
    let whereClause
    if (discover) {
      // DISCOVER LOGIC: Show all public hangouts
      whereClause = {
        privacyLevel: 'PUBLIC'
      }
    } else {
      // HOME FEED LOGIC: Only show hangouts user created or was invited to
      whereClause = {
        OR: [
          // User's own hangouts (all privacy levels)
          { creatorId: userId },
          // Private hangouts where user is a participant (invited)
          {
            AND: [
              { privacyLevel: 'PRIVATE' },
              {
                content_participants: {
                  some: { userId: userId }
                }
              }
            ]
          }
        ]
      }
    }

    const hangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        ...whereClause
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
            isActive: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                lastSeen: true,
                isActive: true
              }
            }
          }
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 20,
      skip: 0,
    })

    return createSuccessResponse({ hangouts })
  } catch (error) {
    console.error('Database error in getHangoutsHandler:', error)
    return createErrorResponse('Database error', 'Failed to fetch hangouts', 500)
  }
}

async function createHangoutHandler(request: AuthenticatedRequest, validatedData?: z.infer<typeof createHangoutSchema>) {
  try {
    const userId = request.user?.userId
    if (!userId) {
      return createErrorResponse('Authentication required', 'User ID not provided', 401)
    }

    // Get data from request body if validation is disabled
    let data = validatedData
    if (!data) {
      try {
        data = await request.json()
      } catch (error) {
        return createErrorResponse('Invalid request', 'Could not parse request body', 400)
      }
    }

    // For the new flow, get start/end times from the first option or use defaults
    let startTime: Date
    let endTime: Date
    
    if (data.options && data.options.length > 0 && data.options[0].dateTime) {
      startTime = new Date(data.options[0].dateTime)
      endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
    } else if (data.startTime && data.endTime) {
      startTime = new Date(data.startTime)
      endTime = new Date(data.endTime)
    } else {
      startTime = new Date()
      endTime = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours later
    }
    
    if (endTime <= startTime) {
      return createErrorResponse('Invalid time range', 'End time must be after start time', 400)
    }

    // Determine hangout flow
    const flowData = {
      type: data.type,
      options: (data.options || []).map(option => ({
        id: option.id || `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: option.title,
        description: option.description,
        location: option.location,
        dateTime: option.dateTime,
        price: option.price,
        eventImage: option.eventImage
      })),
      participants: data.participants || []
    };

    const flowResult = await createHangoutFlow(flowData);

    // For single option hangouts, use the option data for the hangout's basic fields
    const firstOption = data.options && data.options.length > 0 ? data.options[0] : null;
    const hangoutLocation = firstOption?.location || data.location;
    const hangoutPrice = firstOption?.price || 0;
    const hangoutUrl = firstOption?.hangoutUrl || '';

    // Create hangout with creator as participant using transaction
    const hangout = await TransactionQueries.createHangoutWithParticipant({
      title: data.title,
      description: data.description,
      location: hangoutLocation,
      latitude: data.latitude,
      longitude: data.longitude,
      startTime,
      endTime,
      privacyLevel: data.privacyLevel,
      weatherEnabled: data.weatherEnabled ?? false,
      image: data.image,
      creatorId: userId,
      maxParticipants: data.maxParticipants,
      participants: data.participants,
      mandatoryParticipants: data.mandatoryParticipants || [],
      coHosts: data.coHosts || [],
      priceMin: hangoutPrice,
      priceMax: hangoutPrice,
      ticketUrl: hangoutUrl,
    });

    // Create poll for all hangouts with options (both quick_plan and multi_option)
    if (flowData.options.length > 0) {
      await db.polls.create({
        data: {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout.id,
          creatorId: userId,
          title: data.title,
          description: data.description || '',
          options: flowData.options,
          allowMultiple: false,
          isAnonymous: false,
          status: flowResult.requiresVoting ? 'ACTIVE' : 'CONSENSUS_REACHED',
          consensusPercentage: 70,
          expiresAt: flowResult.votingDeadline
        }
      });
    }

    // Add flow-specific data to hangout
    const hangoutWithFlow = {
      ...hangout,
      state: flowResult.state,
      finalizedOption: flowResult.requiresVoting ? null : flowResult.finalizedOption, // Don't set finalized option if voting is required
      requiresVoting: flowResult.requiresVoting,
      requiresRSVP: flowResult.requiresRSVP,
      votes: flowResult.votes || {},
      votingDeadline: flowResult.votingDeadline,
      options: flowData.options
    };

    return createSuccessResponse(hangoutWithFlow, 'Hangout created successfully')
  } catch (error) {
    console.error('Error in createHangoutHandler:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return createErrorResponse('Internal error', `Failed to create hangout: ${error.message}`, 500)
  }
}

// Export handlers with middleware
export const GET = createApiHandler(getHangoutsHandler, {
  requireAuth: true,
  enableRateLimit: true,
  enableCORS: true
})

export const POST = createApiHandler(createHangoutHandler, {
  requireAuth: true,
  enableRateLimit: false,
  enableCORS: true
})
