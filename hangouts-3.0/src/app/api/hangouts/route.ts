import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createHangoutFlow } from '@/lib/hangout-flow'
import { TransactionQueries } from '@/lib/db-queries'

import { logger } from '@/lib/logger'
const createHangoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').nullable().optional(),
  location: z.string().max(200, 'Location too long').nullable().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startTime: z.string().datetime('Invalid start time').optional(),
  endTime: z.string().datetime('Invalid end time').optional(),
  privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).default('PUBLIC'),
  maxParticipants: z.number().min(2, 'Must allow at least 2 participants').max(100, 'Too many participants').optional(),
  weatherEnabled: z.boolean().default(false),
  image: z.string().nullable().optional(),
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
  })).optional()})

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
        privacyLevel: 'PUBLIC' as const
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
              { privacyLevel: 'PRIVATE' as const },
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
      skip: 0})

    return createSuccessResponse({ hangouts })
  } catch (error) {
    logger.error('Database error in getHangoutsHandler:', error);
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
    
    if (data && data.options && data.options.length > 0 && data.options[0]?.dateTime) {
      startTime = new Date(data.options[0].dateTime)
      endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
    } else if (data && data.startTime && data.endTime) {
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
      type: data?.type || 'SINGLE',
      options: ((data?.options || [])).map(option => ({
        id: option.id || `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: option.title,
        description: option.description,
        location: option.location,
        dateTime: option.dateTime,
        price: option.price,
        eventImage: (option as any).eventImage
      })),
      participants: data?.participants || []
    };

    const flowResult = await createHangoutFlow(flowData);

    // For single option hangouts, use the option data for the hangout's basic fields
    const firstOption = data?.options && data.options.length > 0 ? data.options[0] : null;
    const hangoutLocation = firstOption?.location || data?.location;

    // Create hangout with creator as participant using transaction
    const hangout = await TransactionQueries.createHangoutWithParticipant({
      title: data?.title || '',
      description: data?.description || null,
      location: hangoutLocation || null,
      latitude: data?.latitude || null,
      longitude: data?.longitude || null,
      startTime,
      endTime,
      privacyLevel: data?.privacyLevel || 'PUBLIC',
      weatherEnabled: data?.weatherEnabled ?? false,
      image: data?.image || null,
      creatorId: userId,
      maxParticipants: data?.maxParticipants || null,
      participants: data?.participants || [],
      mandatoryParticipants: data?.mandatoryParticipants || [],
      coHosts: data?.coHosts || []});

    // Create poll for all hangouts with options (both quick_plan and multi_option)
    if (flowData.options.length > 0) {
      // console.log('🔍 Creating poll for hangout:', hangout?.id); // Removed for production
      // console.log('🔍 Poll options:', flowData.options); // Removed for production
      // console.log('🔍 Requires voting:', flowResult.requiresVoting); // Removed for production
      
      try {
        const pollData = {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout?.id || '',
          creatorId: userId,
          title: data?.title || '',
          description: data?.description || '',
          options: flowData.options,
          allowMultiple: false,
          isAnonymous: false,
          status: flowResult.requiresVoting ? 'ACTIVE' : 'CONSENSUS_REACHED',
          consensusPercentage: 70,
          expiresAt: flowResult.votingDeadline || null
        };
        
        // console.log('🔍 Poll data to create:', JSON.stringify(pollData, null, 2); // Removed for production);
        
        const poll = await db.polls.create({
          data: pollData
        });
        // console.log('✅ Poll created successfully:', poll.id); // Removed for production
      } catch (error) {
        logger.error('❌ Error creating poll:', error);
        logger.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          meta: (error as any)?.meta
        });
        // Don't throw error, just log it and continue
        // console.log('⚠️ Continuing without poll creation...'); // Removed for production
      }
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
    logger.error('Error in createHangoutHandler:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return createErrorResponse('Internal error', `Failed to create hangout: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
  }
}

// Export handlers with middleware
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const userId = user.id
    const { searchParams } = new URL(request.url)
    const discover = searchParams.get('discover') === 'true'

    // Build where clause based on feed type
    let whereClause: any
    if (discover) {
      // DISCOVER LOGIC: Show all public hangouts
      whereClause = {
        privacyLevel: 'PUBLIC' as const
      }
    } else {
      // HOME FEED LOGIC: Show hangouts user created, was invited to, OR public hangouts
      whereClause = {
        OR: [
          // User's own hangouts (all privacy levels)
          { creatorId: userId },
          // Private hangouts where user is a participant (invited)
          {
            AND: [
              { privacyLevel: 'PRIVATE' as const },
              {
                content_participants: {
                  some: { userId: userId }
                }
              }
            ]
          },
          // Friends-only hangouts where user is a participant
          {
            AND: [
              { privacyLevel: 'FRIENDS_ONLY' as const },
              {
                content_participants: {
                  some: { userId: userId }
                }
              }
            ]
          },
          // PUBLIC hangouts (everyone can see)
          { privacyLevel: 'PUBLIC' as const }
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
        _count: {
          select: {
            content_participants: true,
            comments: true,
            messages: true,
            photos: true,
            rsvps: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json({
      success: true,
      data: hangouts
    })

  } catch (error) {
    logger.error('Error in GET /api/hangouts:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch hangouts'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Hangouts API - POST request received')
    console.log('Hangouts API - Request headers:', Object.fromEntries(request.headers.entries()))
    
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    console.log('Hangouts API - Clerk userId:', clerkUserId)
    
    if (!clerkUserId) {
      console.log('Hangouts API - No clerkUserId, returning 401')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let user = await getClerkApiUser()
    console.log('Hangouts API - Database user found:', user ? 'YES' : 'NO')
    
    if (!user) {
      // User exists in Clerk but not in database - create them
      console.log('Hangouts API - Creating user in database...')
      try {
        user = await db.user.create({
          data: {
            id: clerkUserId,
            clerkId: clerkUserId,
            email: `${clerkUserId}@clerk.temp`,
            username: `user_${clerkUserId.substring(0, 8)}`,
            name: 'New User',
            role: 'USER',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log('Hangouts API - User created successfully:', user.id)
      } catch (dbError: any) {
        console.error('Hangouts API - Error creating user:', dbError.message)
        return NextResponse.json(
          { 
            error: 'Failed to create user',
            message: dbError.message
          },
          { status: 500 }
        )
      }
    }

    const userId = user.id
    console.log('Hangouts API - Using userId:', userId)
    
    const data = await request.json()
    console.log('Hangouts API - Request data received:', { 
      title: data.title, 
      type: data.type,
      hasOptions: !!data.options,
      optionsCount: data.options?.length || 0,
      hasParticipants: !!data.participants,
      participantsCount: data.participants?.length || 0,
      privacyLevel: data.privacyLevel,
      hasImage: !!data.image
    })
    console.log('Hangouts API - Full request data:', JSON.stringify(data, null, 2))

    // Validate the request data
    console.log('Hangouts API - Validating data...')
    const validatedData = createHangoutSchema.parse(data)
    console.log('Hangouts API - Data validated successfully')

    // For the new flow, get start/end times from the first option or use defaults
    let startTime: Date
    let endTime: Date
    
    if (validatedData.options && validatedData.options.length > 0) {
      // Use the first option's dateTime as start time
      const firstOption = validatedData.options[0]
      startTime = new Date(firstOption.dateTime || new Date())
      // End time is 3 hours after start time
      endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000)
    } else {
      // Default times if no options
      startTime = new Date()
      endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000)
    }

    // Determine the flow
    const flowResult = createHangoutFlow({
      type: validatedData.type || 'multi_option',
      options: validatedData.options || [],
      participants: validatedData.participants || []
    })

    // Create the hangout in the database
    console.log('Hangouts API - Creating hangout in database...')
    const hangout = await db.content.create({
      data: {
        id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'HANGOUT',
        title: validatedData.title,
        description: validatedData.description || null,
        location: validatedData.location || null,
        latitude: validatedData.latitude || null,
        longitude: validatedData.longitude || null,
        startTime,
        endTime,
        privacyLevel: validatedData.privacyLevel || 'PUBLIC',
        creatorId: userId,
        image: validatedData.image || null,
        weatherEnabled: validatedData.weatherEnabled ?? false,
        maxParticipants: validatedData.maxParticipants || null,
        status: 'PUBLISHED',
        priceMin: 0,
        priceMax: null,
        currency: 'USD',
        ticketUrl: null,
        attendeeCount: 0,
        externalEventId: null,
        source: 'MANUAL',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('Hangouts API - Hangout created successfully:', hangout.id)

    // Add creator as participant
    console.log('Hangouts API - Adding creator as participant...')
    await db.content_participants.create({
      data: {
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: hangout.id,
        userId: userId,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: true,
        isCoHost: false,
        joinedAt: new Date()
      }
    })
    console.log('Hangouts API - Creator added as participant')

    // Add other participants if specified
    if (validatedData.participants && validatedData.participants.length > 0) {
      console.log('Hangouts API - Adding other participants...')
      for (const participantId of validatedData.participants) {
        await db.content_participants.create({
          data: {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangout.id,
            userId: participantId,
            role: 'MEMBER',
            canEdit: false,
            isMandatory: false,
            isCoHost: false
          }
        })
      }
      console.log('Hangouts API - Other participants added')
    }

    // Create poll for hangouts with multiple options
    if (validatedData.options && validatedData.options.length > 1) {
      console.log('Hangouts API - Creating poll...')
      try {
        const pollData = {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout.id,
          creatorId: userId,
          title: validatedData.title,
          description: validatedData.description || '',
          options: validatedData.options,
          allowMultiple: validatedData.type === 'multi_option',
          isAnonymous: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          consensusPercentage: 70,
          minimumParticipants: Math.max(2, validatedData.participants?.length || 2),
          consensusType: 'percentage',
          status: 'ACTIVE',
          allowDelegation: false,
          allowAbstention: true,
          allowAddOptions: true,
          isPublic: validatedData.privacyLevel === 'PUBLIC',
          visibility: validatedData.privacyLevel === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'
        }

        await db.polls.create({
          data: pollData
        })

        console.log('Hangouts API - Poll created successfully for hangout:', hangout.id)
      } catch (pollError) {
        console.error('Hangouts API - Error creating poll:', pollError)
        // Don't fail the entire request if poll creation fails
      }
    }

    console.log('Hangouts API - Returning success response')
    return NextResponse.json({
      success: true,
      data: {
        id: hangout.id,
        title: hangout.title,
        description: hangout.description,
        location: hangout.location,
        startTime: hangout.startTime,
        endTime: hangout.endTime,
        privacyLevel: hangout.privacyLevel,
        image: hangout.image,
        creatorId: hangout.creatorId,
        createdAt: hangout.createdAt,
        updatedAt: hangout.updatedAt,
        requiresVoting: flowResult.requiresVoting,
        options: validatedData.options || [],
        participants: validatedData.participants || []
      }
    })

  } catch (error: any) {
    console.error('Hangouts API - Error in POST:', error)
    console.error('Hangouts API - Error message:', error.message)
    console.error('Hangouts API - Error stack:', error.stack)
    console.error('Hangouts API - Error name:', error.name)
    console.error('Hangouts API - Error code:', error.code)
    logger.error('Error in POST /api/hangouts:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create hangout',
        details: error.message,
        errorName: error.name,
        errorCode: error.code
      },
      { status: 500 }
    )
  }
}
