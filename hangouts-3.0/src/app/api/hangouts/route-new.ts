import { NextRequest, NextResponse } from 'next/server'
import { 
  withErrorHandling, 
  withAuth, 
  withValidation, 
  createSuccessResponse, 
  createCreatedResponse,
  ApiError,
  NotFoundError,
  UnauthorizedError
} from '@/lib/api-error-handler'
import { hangoutSchemas, ValidationUtils } from '@/lib/validation'
import { TransactionQueries } from '@/lib/db-queries'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// GET /api/hangouts - Get user's hangouts
async function getHangouts(request: NextRequest) {
  // Extract user ID from auth header (would be set by auth middleware)
  const userId = request.headers.get('x-user-id')
  
  if (!userId) {
    throw new UnauthorizedError('User ID not provided')
  }

  // Parse query parameters
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const status = url.searchParams.get('status')
  const privacy = url.searchParams.get('privacy')

  // Validate pagination
  const paginationResult = ValidationUtils.validatePagination(page, limit)
  if (!paginationResult.isValid) {
    throw new ApiError('Invalid pagination parameters', 400, 'BAD_REQUEST', {
      errors: paginationResult.errors
    })
  }

  try {
    // Build where clause for user's hangouts
    const whereClause = {
      type: 'HANGOUT' as const,
      OR: [
        // User's own hangouts (all privacy levels)
        { creatorId: userId },
        // Private hangouts where user is a participant
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

    // Add status filter if provided
    if (status) {
      whereClause.status = status as any
    }

    // Add privacy filter if provided
    if (privacy) {
      whereClause.privacyLevel = privacy as any
    }

    // Get total count for pagination
    const total = await db.content.count({ where: whereClause })

    // Get hangouts with pagination
    const hangouts = await db.content.findMany({
      where: whereClause,
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
        hangout_details: true,
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
      take: limit,
      skip: (page - 1) * limit})

    return createSuccessResponse({
      hangouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Hangouts retrieved successfully')
  } catch (error) {
    logger.error('Database error in getHangouts:', error);
    throw new ApiError('Failed to fetch hangouts', 500, 'INTERNAL_ERROR')
  }
}

// POST /api/hangouts - Create new hangout
async function createHangout(validatedData: any, request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  
  if (!userId) {
    throw new UnauthorizedError('User ID not provided')
  }

  try {
    // Validate end time is after start time
    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)
    
    if (endTime <= startTime) {
      throw new ApiError('End time must be after start time', 400, 'BAD_REQUEST')
    }

    // Create hangout with creator as participant using transaction
    const hangout = await TransactionQueries.createHangoutWithParticipant({
      title: validatedData.title,
      description: validatedData.description,
      location: validatedData.location,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      startTime,
      endTime,
      privacyLevel: validatedData.privacyLevel,
      weatherEnabled: validatedData.weatherEnabled ?? false,
      image: validatedData.image,
      creatorId: userId,
      maxParticipants: validatedData.maxParticipants,
      participants: validatedData.participants})

    return createCreatedResponse(hangout, 'Hangout created successfully')
  } catch (error) {
    logger.error('Error in createHangout:', error);
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(`Failed to create hangout: ${error.message}`, 500, 'INTERNAL_ERROR')
  }
}

// Export handlers with middleware
export const GET = withErrorHandling(
  withAuth(getHangouts)
)

export const POST = withErrorHandling(
  withAuth(
    withValidation(hangoutSchemas.create, createHangout)
  )
)


























