import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { db } from '@/lib/db'
import { z } from 'zod'

import { logger } from '@/lib/logger'
const createContentSchema = z.object({
  type: z.enum(['HANGOUT', 'EVENT']),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  image: z.string().optional(),
  location: z.string().max(200, 'Location too long').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).default('PUBLIC'),
  
  // Event-specific fields
  venue: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  currency: z.string().length(3).optional().default('USD'),
  ticketUrl: z.string().url().optional(),
  attendeeCount: z.number().min(0).optional().default(0),
  externalEventId: z.string().optional(),
  source: z.enum(['MANUAL', 'FACEBOOK', 'MEETUP', 'OTHER']).optional().default('MANUAL'),
  tags: z.array(z.string()).optional(),
  
  // Hangout-specific fields
  maxParticipants: z.number().min(2).max(100).optional(),
  weatherEnabled: z.boolean().optional().default(false),
  participants: z.array(z.string()).optional(), // Array of user IDs to invite
  mandatoryParticipants: z.array(z.string()).optional(), // Array of mandatory user IDs
  coHosts: z.array(z.string()).optional(), // Array of co-host user IDs
  consensusPercentage: z.number().min(50).max(100).optional().default(70),
  
  // Poll options for hangouts
  options: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Option title is required'),
    description: z.string().optional(),
    location: z.string().optional(),
    dateTime: z.string().optional(),
    price: z.number().optional(),
    eventImage: z.string().optional()
  })).optional()})

async function createContentHandler(request: AuthenticatedRequest, validatedData?: z.infer<typeof createContentSchema>) {
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

    // Validate start and end times
    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)
    
    if (endTime <= startTime) {
      return createErrorResponse('Invalid time range', 'End time must be after start time', 400)
    }

    // Create content record
    const content = await db.content.create({
      data: {
        id: `${data.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data.type,
        title: data.title,
        description: data.description,
        image: data.image,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        startTime: startTime,
        endTime: endTime,
        status: 'PUBLISHED',
        privacyLevel: data.privacyLevel,
        creatorId: userId,
        // Event-specific fields
        venue: data.venue,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        currency: data.currency,
        ticketUrl: data.ticketUrl,
        attendeeCount: data.attendeeCount,
        externalEventId: data.externalEventId,
        source: data.source,
        // Hangout-specific fields
        maxParticipants: data.maxParticipants,
        weatherEnabled: data.weatherEnabled
      }
    })

    // Add creator as participant
    await db.content_participants.create({
      data: {
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        userId: userId,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: false,
        isCoHost: false,
        joinedAt: new Date()
      }
    })

    // Add other participants
    if (data.participants && data.participants.length > 0) {
      const participantData = data.participants.map(participantId => ({
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        userId: participantId,
        role: 'MEMBER',
        canEdit: false,
        isMandatory: data.mandatoryParticipants?.includes(participantId) || false,
        isCoHost: data.coHosts?.includes(participantId) || false,
        invitedAt: new Date()
      }))

      await db.content_participants.createMany({
        data: participantData
      })
    }

    // Create poll for hangouts with multiple options
    if (data.type === 'HANGOUT' && data.options && data.options.length > 1) {
      const poll = await db.polls.create({
        data: {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: content.id,
          creatorId: userId,
          title: data.title,
          description: data.description || '',
          options: data.options.map(option => ({
            id: option.id || `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: option.title,
            description: option.description,
            location: option.location,
            dateTime: option.dateTime,
            price: option.price,
            eventImage: option.eventImage
          })),
          allowMultiple: false,
          isAnonymous: false,
          status: 'ACTIVE',
          consensusPercentage: data.consensusPercentage,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      })

      // Create RSVP records for all participants
      const allParticipants = await db.content_participants.findMany({
        where: { contentId: content.id }
      })

      const rsvpData = allParticipants.map(participant => ({
        id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        userId: participant.userId,
        status: 'PENDING' as const,
        respondedAt: null}))

      await db.rsvp.createMany({
        data: rsvpData
      })
    } else if (data.type === 'EVENT') {
      // Create RSVP records for events
      const rsvpData = [
        {
          id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: content.id,
          userId: userId,
          status: 'YES' as const,
          respondedAt: new Date()}
      ]

      if (data.participants && data.participants.length > 0) {
        data.participants.forEach(participantId => {
          rsvpData.push({
            id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: content.id,
            userId: participantId,
            status: 'PENDING' as const,
            respondedAt: null})
        })
      }

      await db.rsvp.createMany({
        data: rsvpData
      })
    }

    // Create event tags if provided
    if (data.type === 'EVENT' && data.tags && data.tags.length > 0) {
      const tagData = data.tags.map(tag => ({
        id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        tag: tag
      }))

      await db.eventTag.createMany({
        data: tagData
      })
    }

    return createSuccessResponse({
      id: content.id,
      type: content.type,
      title: content.title,
      description: content.description,
      image: content.image,
      location: content.location,
      startTime: content.startTime?.toISOString(),
      endTime: content.endTime?.toISOString(),
      privacyLevel: content.privacyLevel,
      createdAt: content.createdAt.toISOString(),
      updatedAt: content.updatedAt.toISOString()
    }, `${data.type} created successfully`)
  } catch (error) {
    logger.error('Error in createContentHandler:', error);
    return createErrorResponse('Internal error', `Failed to create ${data?.type || 'content'}: ${error.message}`, 500)
  }
}

export const POST = createApiHandler(createContentHandler, {
  requireAuth: true,
  enableRateLimit: false,
  enableCORS: true
})







