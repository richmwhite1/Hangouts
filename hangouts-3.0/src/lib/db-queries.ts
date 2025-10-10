import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Common select fields for user data
export const userSelect = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  lastSeen: true,
  isActive: true} as const

// Common select fields for hangout data
export const hangoutSelect = {
  id: true,
  title: true,
  description: true,
  location: true,
  latitude: true,
  longitude: true,
  startTime: true,
  endTime: true,
  status: true,
  privacyLevel: true,
  maxParticipants: true,
  weatherEnabled: true,
  createdAt: true,
  updatedAt: true} as const

// Common include for hangout with relations
export const hangoutInclude = {
  users: {
    select: userSelect
  },
  content_participants: {
    include: {
      users: {
        select: userSelect
      }
    },
    orderBy: { joinedAt: 'asc' }
  },
  _count: {
    select: {
      content_participants: true,
      comments: true,
      content_likes: true,
      content_shares: true,
      messages: true}
  }
} as const

// Optimized hangout queries
export class HangoutQueries {
  // Get hangouts for a user with pagination
  static async getUserHangouts(
    userId: string,
    options: {
      status?: string
      privacy?: string
      limit?: number
      offset?: number
      includePast?: boolean
    } = {}
  ) {
    const {
      status,
      privacy,
      limit = 20,
      offset = 0,
      includePast = false
    } = options

    const where: Prisma.ContentWhereInput = {
      type: 'HANGOUT',
      OR: [
        { creatorId: userId },
        { 
          participants: {
            some: { userId }
          }
        }
      ]
    }

    if (status) {
      where.status = status as Prisma.ContentStatus
    }

    if (privacy === 'PUBLIC') {
      where.privacyLevel = 'PUBLIC'
    }

    if (!includePast) {
      where.startTime = {
        gte: new Date()
      }
    }

    return await db.content.findMany({
      where,
      include: hangoutInclude,
      orderBy: { startTime: 'asc' },
      take: limit,
      skip: offset})
  }

  // Get public hangouts for discovery
  static async getPublicHangouts(
    options: {
      limit?: number
      offset?: number
      location?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ) {
    const {
      limit = 20,
      offset = 0,
      location,
      startDate,
      endDate
    } = options

    const where: Prisma.ContentWhereInput = {
      type: 'HANGOUT',
      privacyLevel: 'PUBLIC',
      status: 'PUBLISHED'
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      }
    }

    if (startDate || endDate) {
      where.startTime = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate })
      }
    }

    return await db.content.findMany({
      where,
      include: hangoutInclude,
      orderBy: { startTime: 'asc' },
      take: limit,
      skip: offset})
  }

  // Get hangout by ID with all relations
  static async getHangoutById(id: string) {
    return await db.content.findUnique({
      where: { 
        id,
        type: 'HANGOUT'
      },
      include: {
        ...hangoutInclude,
        messages: {
          include: {
            sender: {
              select: userSelect
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  }

  // Get hangout participants
  static async getHangoutParticipants(hangoutId: string) {
    return await db.contentParticipant.findMany({
      where: { contentId: hangoutId },
      include: {
        user: {
          select: userSelect
        }
      },
      orderBy: { joinedAt: 'asc' }
    })
  }

  // Check if user is participant
  static async isUserParticipant(hangoutId: string, userId: string) {
    const participant = await db.contentParticipant.findUnique({
      where: {
        contentId_userId: {
          contentId: hangoutId,
          userId
        }
      }
    })
    return !!participant
  }

  // Get user's hangout count
  static async getUserHangoutCount(userId: string) {
    const [created, participating] = await Promise.all([
      db.content.count({
        where: { 
          type: 'HANGOUT',
          creatorId: userId 
        }
      }),
      db.contentParticipant.count({
        where: { userId }
      })
    ])
    
    return { created, participating }
  }
}

// Optimized friend queries
export class FriendQueries {
  // Get user's friends
  static async getUserFriends(userId: string) {
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: userSelect
        },
        user2: {
          select: userSelect
        }
      }
    })

    const friends = friendships.map(friendship => {
      const friend = friendship.user1Id === userId ? friendship.user2 : friendship.user1
      return {
        ...friend,
        friendshipId: friendship.id,
        friendsSince: friendship.createdAt}
    })

    // Sort by lastSeen (most recent first)
    return friends.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
  }

  // Get friend requests
  static async getFriendRequests(userId: string, type: 'sent' | 'received' = 'received') {
    const where = type === 'sent' 
      ? { senderId: userId }
      : { receiverId: userId }

    return await db.friendRequest.findMany({
      where: {
        ...where,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: userSelect
        },
        receiver: {
          select: userSelect
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Check if users are friends
  static async areFriends(user1Id: string, user2Id: string) {
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id }
        ]
      }
    })
    return !!friendship
  }
}

// Optimized notification queries
export class NotificationQueries {
  // Get user notifications
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      type?: string
    } = {}
  ) {
    const {
      limit = 20,
      offset = 0,
      unreadOnly = false,
      type
    } = options

    const where: Prisma.NotificationWhereInput = {
      userId
    }

    if (unreadOnly) {
      where.isRead = false
    }

    if (type) {
      where.type = type as Prisma.NotificationType
    }

    return await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset})
  }

  // Get unread notification count
  static async getUnreadCount(userId: string) {
    return await db.notification.count({
      where: {
        userId,
        isRead: false
      }
    })
  }

  // Mark notifications as read
  static async markAsRead(userId: string, notificationIds?: string[]) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      isRead: false
    }

    if (notificationIds) {
      where.id = {
        in: notificationIds
      }
    }

    return await db.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }
}

// Transaction utilities
export class TransactionQueries {
  // Create hangout with creator as participant
  static async createHangoutWithParticipant(data: {
    title: string
    description?: string | null
    location?: string | null
    latitude?: number | null
    longitude?: number | null
    startTime: Date
    endTime: Date
    privacyLevel: string
    maxParticipants?: number | null
    weatherEnabled: boolean
    image?: string | null
    creatorId: string
    participants?: string[] // Array of user IDs to invite
    mandatoryParticipants?: string[] // Array of mandatory user IDs
    coHosts?: string[] // Array of co-host user IDs
  }) {
    return await db.$transaction(async (tx) => {
      const hangout = await tx.content.create({
        data: {
          id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'HANGOUT',
          title: data.title,
          description: data.description,
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          startTime: data.startTime,
          endTime: data.endTime,
          status: 'PUBLISHED',
          privacyLevel: data.privacyLevel,
          image: data.image,
          creatorId: data.creatorId,
          updatedAt: new Date(),
          // Hangout-specific fields
          maxParticipants: data.maxParticipants,
          weatherEnabled: data.weatherEnabled,
          content_participants: {
            create: {
              id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: data.creatorId,
              role: 'CREATOR',
              canEdit: true,
              joinedAt: new Date()}
          }
        },
        include: hangoutInclude
      })

      // Add invited participants if provided (excluding creator)
      if (data.participants && data.participants.length > 0) {
        const participantData = data.participants
          .filter(userId => userId !== data.creatorId) // Exclude creator
          .map(userId => {
            const isCoHost = data.coHosts?.includes(userId) || false
            const isMandatory = data.mandatoryParticipants?.includes(userId) || false
            
            return {
              id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              contentId: hangout.id,
              userId: userId,
              role: isCoHost ? 'CO_HOST' as const : 'MEMBER' as const,
              canEdit: isCoHost, // Co-hosts get edit permissions
              isMandatory: isMandatory,
              isCoHost: isCoHost,
              invitedAt: new Date()}
          })

        if (participantData.length > 0) {
          await tx.content_participants.createMany({
            data: participantData
          })
        }
      }

      // Create RSVP records for all participants
      const rsvpData = [
        {
          contentId: hangout.id, // Use content ID directly
          userId: data.creatorId,
          status: 'YES' as const,
          respondedAt: new Date()},
        ...(data.participants || [])
          .filter(userId => userId !== data.creatorId)
          .map(userId => ({
            contentId: hangout.id, // Use content ID directly
            userId: userId,
            status: 'PENDING' as const,
            respondedAt: null}))
      ]

      await tx.rsvp.createMany({
        data: rsvpData
      })

      // Fetch the hangout with all participants
      const hangoutWithParticipants = await tx.content.findUnique({
        where: { id: hangout.id },
        include: hangoutInclude
      })

      return hangoutWithParticipants
    })
  }

  // Accept friend request and create friendship
  static async acceptFriendRequest(requestId: string) {
    return await db.$transaction(async (tx) => {
      const request = await tx.friendRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: { select: userSelect },
          receiver: { select: userSelect }
        }
      })

      if (!request) {
        throw new Error('Friend request not found')
      }

      // Update request status
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      })

      // Create friendship (both directions for easier querying)
      await tx.friendship.createMany({
        data: [
          {
            user1Id: request.senderId,
            user2Id: request.receiverId
          },
          {
            user1Id: request.receiverId,
            user2Id: request.senderId
          }
        ],
        skipDuplicates: true
      })

      return request
    })
  }
}
