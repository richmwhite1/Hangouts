import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export interface SharedHangout {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime?: Date
  endTime?: Date
  createdAt: Date
  lastActivityAt?: Date
  photoCount: number
  commentCount: number
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

export interface FriendHangoutStats {
  lastHangoutDate?: Date
  totalHangouts: number
  invitedCount: number
  wasInvitedCount: number
  lastHangout?: SharedHangout
}

/**
 * Determines if a hangout is "successful" - both users are participants and both RSVP'd YES
 */
function isSuccessfulHangout(
  hangout: any,
  userId1: string,
  userId2: string
): boolean {
  // Check if both users are participants
  const participants = hangout.content_participants || []
  const user1Participant = participants.find((p: any) => p.userId === userId1)
  const user2Participant = participants.find((p: any) => p.userId === userId2)

  if (!user1Participant || !user2Participant) {
    return false
  }

  // Check if both have RSVP'd YES
  const rsvps = hangout.rsvps || []
  const user1RSVP = rsvps.find((r: any) => r.userId === userId1)
  const user2RSVP = rsvps.find((r: any) => r.userId === userId2)

  if (!user1RSVP || !user2RSVP) {
    return false
  }

  return user1RSVP.status === 'YES' && user2RSVP.status === 'YES'
}

/**
 * Get all shared hangouts between two users
 */
export async function getSharedHangouts(
  userId1: string,
  userId2: string
): Promise<SharedHangout[]> {
  try {
    // Find hangouts where both users are participants
    const hangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        status: { in: ['PUBLISHED', 'ACTIVE'] }, // Allow both PUBLISHED and ACTIVE status
        content_participants: {
          some: {
            userId: userId1
          }
        }
      },
      include: {
        content_participants: {
          where: {
            userId: { in: [userId1, userId2] }
          }
        },
        rsvps: {
          where: {
            userId: { in: [userId1, userId2] }
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        photos: {
          select: {
            id: true
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            photos: true,
            comments: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    // Filter to only successful hangouts (both participants, both YES)
    const successfulHangouts = hangouts.filter(hangout => {
      // Check if user2 is also a participant
      const hasUser2 = hangout.content_participants.some(
        (p: any) => p.userId === userId2
      )
      if (!hasUser2) return false

      return isSuccessfulHangout(hangout, userId1, userId2)
    })

    // Transform to SharedHangout format
    return successfulHangouts.map(hangout => ({
      id: hangout.id,
      title: hangout.title,
      description: hangout.description || undefined,
      image: hangout.image || undefined,
      location: hangout.location || undefined,
      startTime: hangout.startTime || undefined,
      endTime: hangout.endTime || undefined,
      createdAt: hangout.createdAt,
      lastActivityAt: hangout.lastActivityAt || undefined,
      photoCount: hangout._count.photos,
      commentCount: hangout._count.comments,
      creator: {
        id: hangout.users.id,
        name: hangout.users.name,
        username: hangout.users.username,
        avatar: hangout.users.avatar || undefined
      }
    }))
  } catch (error) {
    logger.error('Error getting shared hangouts:', error)
    throw error
  }
}

/**
 * Get the most recent shared hangout between two users
 */
export async function getLastHangout(
  userId1: string,
  userId2: string
): Promise<SharedHangout | null> {
  const sharedHangouts = await getSharedHangouts(userId1, userId2)
  return sharedHangouts.length > 0 ? sharedHangouts[0] : null
}

/**
 * Get relationship statistics between two users
 */
export async function getHangoutStats(
  userId1: string,
  userId2: string
): Promise<FriendHangoutStats> {
  try {
    // Get all shared hangouts
    const sharedHangouts = await getSharedHangouts(userId1, userId2)

    // Count how many times userId1 invited userId2 (userId1 is creator)
    const invitedCount = await db.content.count({
      where: {
        type: 'HANGOUT',
        creatorId: userId1,
        content_participants: {
          some: {
            userId: userId2
          }
        },
        status: { in: ['PUBLISHED', 'ACTIVE', 'DRAFT'] } // Count all statuses for invite tracking
      }
    })

    // Count how many times userId2 invited userId1 (userId2 is creator)
    const wasInvitedCount = await db.content.count({
      where: {
        type: 'HANGOUT',
        creatorId: userId2,
        content_participants: {
          some: {
            userId: userId1
          }
        },
        status: { in: ['PUBLISHED', 'ACTIVE', 'DRAFT'] } // Count all statuses for invite tracking
      }
    })

    const lastHangout = sharedHangouts.length > 0 ? sharedHangouts[0] : undefined

    return {
      lastHangoutDate: lastHangout?.startTime || lastHangout?.createdAt,
      totalHangouts: sharedHangouts.length,
      invitedCount,
      wasInvitedCount,
      lastHangout
    }
  } catch (error) {
    logger.error('Error getting hangout stats:', error)
    throw error
  }
}

