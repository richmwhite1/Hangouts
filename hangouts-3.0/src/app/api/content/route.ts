import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

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

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const data = await request.json()
    const validatedData = createContentSchema.parse(data)

    // Validate start and end times
    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)
    
    if (endTime <= startTime) {
      return NextResponse.json(createErrorResponse('Invalid time range', 'End time must be after start time'), { status: 400 })
    }

    // Create content record
    const content = await db.content.create({
      data: {
        id: `${validatedData.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        image: validatedData.image,
        location: validatedData.location,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        startTime: startTime,
        endTime: endTime,
        status: 'PUBLISHED',
        privacyLevel: validatedData.privacyLevel,
        creatorId: user.id,
        // Event-specific fields
        venue: validatedData.venue,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        priceMin: validatedData.priceMin,
        priceMax: validatedData.priceMax,
        currency: validatedData.currency,
        ticketUrl: validatedData.ticketUrl,
        attendeeCount: validatedData.attendeeCount,
        externalEventId: validatedData.externalEventId,
        source: validatedData.source,
        // Hangout-specific fields
        maxParticipants: validatedData.maxParticipants,
        weatherEnabled: validatedData.weatherEnabled
      }
    })

    // Add creator as participant
    await db.content_participants.create({
      data: {
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        userId: user.id,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: false,
        isCoHost: false,
        joinedAt: new Date()
      }
    })

    // Add other participants
    if (validatedData.participants && validatedData.participants.length > 0) {
      const participantData = validatedData.participants.map(participantId => ({
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        userId: participantId,
        role: 'MEMBER',
        canEdit: false,
        isMandatory: validatedData.mandatoryParticipants?.includes(participantId) || false,
        isCoHost: validatedData.coHosts?.includes(participantId) || false,
        invitedAt: new Date()
      }))

      await db.content_participants.createMany({
        data: participantData
      })
    }

    // Create poll for hangouts with multiple options
    if (validatedData.type === 'HANGOUT' && validatedData.options && validatedData.options.length > 1) {
      const poll = await db.polls.create({
        data: {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: content.id,
          creatorId: user.id,
          title: validatedData.title,
          description: validatedData.description || '',
          options: validatedData.options.map(option => ({
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
          consensusPercentage: validatedData.consensusPercentage,
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
    } else if (validatedData.type === 'EVENT') {
      // Create RSVP records for events
      const rsvpData = [
        {
          id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: content.id,
          userId: user.id,
          status: 'YES' as const,
          respondedAt: new Date()}
      ]

      if (validatedData.participants && validatedData.participants.length > 0) {
        validatedData.participants.forEach(participantId => {
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
    if (validatedData.type === 'EVENT' && validatedData.tags && validatedData.tags.length > 0) {
      const tagData = validatedData.tags.map(tag => ({
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
    }, `${validatedData.type} created successfully`)
  } catch (error) {
    logger.error('Error in createContentHandler:', error);
    return NextResponse.json(createErrorResponse('Internal error', `Failed to create ${validatedData?.type || 'content'}: ${error.message}`), { status: 500 })
  }
}







