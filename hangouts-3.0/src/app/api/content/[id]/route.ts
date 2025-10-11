import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse } from '@/lib/api-handler'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
async function getContentHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params

    // Get user ID for personalized data
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      if (payload) {
        userId = user.id
      }
    }

    // Fetch content with all related data
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        image: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        status: true,
        privacyLevel: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
        // Event-specific fields
        venue: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        priceMin: true,
        priceMax: true,
        currency: true,
        ticketUrl: true,
        attendeeCount: true,
        externalEventId: true,
        source: true,
        // Hangout-specific fields
        maxParticipants: true,
        weatherEnabled: true,
        // Creator info
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
        // Participants
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
        // Comments
        comments: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        // Event tags
        eventTags: {
          select: {
            tag: true
          }
        },
        // Event images
        eventImages: {
          select: {
            imageUrl: true,
            orderIndex: true
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        // Event saves
        eventSaves: {
          select: {
            userId: true,
            createdAt: true
          }
        },
        // Polls (for hangouts)
        polls: {
          select: {
            id: true,
            title: true,
            description: true,
            options: true,
            status: true,
            consensusPercentage: true,
            expiresAt: true,
            createdAt: true,
            votes: {
              include: {
                users: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        // Photos
        photos: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        // RSVPs
        rsvps: {
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
        },
        // Messages
        messages: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        // Counts
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true,
            photos: true,
            rsvps: true,
            eventSaves: true
          }
        }
      }
    })

    if (!content) {
      return createErrorResponse('Not found', 'Content not found', 404)
    }

    // Check access permissions
    if (content.privacyLevel === 'PRIVATE') {
      if (!userId) {
        return createErrorResponse('Unauthorized', 'Authentication required', 401)
      }
      
      const isParticipant = content.content_participants.some(p => p.userId === userId)
      const isCreator = content.creatorId === userId
      
      if (!isParticipant && !isCreator) {
        return createErrorResponse('Forbidden', 'Access denied', 403)
      }
    }

    // Process votes for hangouts
    const userVotes: any = {}
    const userPreferred: any = {}
    const votes: any = {}

    if (content.type === 'HANGOUT' && content.polls.length > 0) {
      const poll = content.polls[0]
      const pollVotes = poll.votes || []

      // Process votes
      pollVotes.forEach((vote: any) => {
        if (!votes[vote.option]) {
          votes[vote.option] = []
        }
        votes[vote.option].push(vote)

        if (!userVotes[vote.userId]) {
          userVotes[vote.userId] = []
        }
        if (!userVotes[vote.userId].includes(vote.option)) {
          userVotes[vote.userId].push(vote.option)
        }

        if (vote.isPreferred) {
          userPreferred[vote.userId] = vote.option
        }
      })
    }

    // Get user's RSVP status
    let userRSVP = null
    if (userId) {
      userRSVP = content.rsvps.find(rsvp => rsvp.userId === userId)
    }

    // Determine content state
    let state = 'draft'
    let requiresVoting = false
    let requiresRSVP = false

    if (content.type === 'HANGOUT') {
      if (content.polls.length > 0) {
        const poll = content.polls[0]
        if (poll.status === 'ACTIVE') {
          state = 'polling'
          requiresVoting = true
        } else if (poll.status === 'CONSENSUS_REACHED') {
          state = 'confirmed'
          requiresRSVP = true
        }
      } else {
        state = 'confirmed'
        requiresRSVP = true
      }
    } else if (content.type === 'EVENT') {
      state = 'confirmed'
      requiresRSVP = true
    }

    // Transform the data
    const transformedContent = {
      id: content.id,
      type: content.type,
      title: content.title,
      description: content.description,
      image: content.image,
      location: content.location,
      latitude: content.latitude,
      longitude: content.longitude,
      startTime: content.startTime?.toISOString(),
      endTime: content.endTime?.toISOString(),
      status: content.status,
      privacyLevel: content.privacyLevel,
      createdAt: content.createdAt.toISOString(),
      updatedAt: content.updatedAt.toISOString(),
      creator: content.users,
      participants: content.content_participants.map(p => ({
        id: p.id,
        contentId: p.contentId,
        userId: p.userId,
        role: p.role,
        canEdit: p.canEdit,
        isMandatory: p.isMandatory,
        isCoHost: p.isCoHost,
        invitedAt: p.invitedAt.toISOString(),
        joinedAt: p.joinedAt?.toISOString(),
        user: p.users,
        rsvpStatus: content.rsvps.find(rsvp => rsvp.userId === p.userId)?.status || 'PENDING'
      })),
      // Event-specific data
      ...(content.type === 'EVENT' && {
        venue: content.venue,
        address: content.address,
        city: content.city,
        state: content.state,
        zipCode: content.zipCode,
        price: {
          min: content.priceMin,
          max: content.priceMax,
          currency: content.currency
        },
        ticketUrl: content.ticketUrl,
        attendeeCount: content.attendeeCount,
        externalEventId: content.externalEventId,
        source: content.source,
        tags: content.eventTags.map(tag => tag.tag),
        images: content.eventImages.map(img => img.imageUrl),
        saveCount: content._count.eventSaves
      }),
      // Hangout-specific data
      ...(content.type === 'HANGOUT' && {
        maxParticipants: content.maxParticipants,
        weatherEnabled: content.weatherEnabled,
        polls: content.polls.map(poll => ({
          id: poll.id,
          title: poll.title,
          description: poll.description,
          options: poll.options,
          status: poll.status,
          consensusPercentage: poll.consensusPercentage,
          expiresAt: poll.expiresAt?.toISOString(),
          createdAt: poll.createdAt.toISOString()
        })),
        userVotes: userVotes,
        userPreferred: userPreferred,
        votes: votes
      }),
      // Common data
      photos: content.photos.map(photo => ({
        id: photo.id,
        originalUrl: photo.originalUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        createdAt: photo.createdAt.toISOString(),
        user: photo.users
      })),
      rsvps: content.rsvps.map(rsvp => ({
        id: rsvp.id,
        contentId: content.id,
        userId: rsvp.userId,
        status: rsvp.status,
        respondedAt: rsvp.respondedAt?.toISOString(),
        createdAt: rsvp.createdAt.toISOString(),
        user: rsvp.users
      })),
      messages: content.messages.map(message => ({
        id: message.id,
        contentId: message.contentId,
        senderId: message.senderId,
        text: message.text,
        type: message.type,
        attachments: message.attachments,
        replyToId: message.replyToId,
        editedAt: message.editedAt?.toISOString(),
        createdAt: message.createdAt.toISOString(),
        user: message.users
      })),
      comments: content.comments.map(comment => ({
        id: comment.id,
        contentId: comment.contentId,
        userId: comment.userId,
        text: comment.text,
        replyToId: comment.replyToId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        user: comment.users
      })),
      counts: {
        participants: content._count.content_participants,
        comments: content._count.comments,
        likes: content._count.content_likes,
        shares: content._count.content_shares,
        messages: content._count.messages,
        photos: content._count.photos,
        rsvps: content._count.rsvps,
        saves: content._count.eventSaves
      },
      // State information
      state,
      requiresVoting,
      requiresRSVP,
      userRSVP
    }

    return createSuccessResponse(transformedContent)
  } catch (error) {
    logger.error('Database error in getContentHandler:', error);
    return createErrorResponse('Database error', 'Failed to fetch content', 500)
  }
}

export const GET = createApiHandler(getContentHandler, {
  requireAuth: false, // Handle auth in the function
  enableRateLimit: true,
  enableCORS: true
})







