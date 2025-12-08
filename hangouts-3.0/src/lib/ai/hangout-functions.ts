/**
 * AI Function Declarations for Hangout Creation
 * 
 * These functions can be called by Gemini AI to help create hangouts
 */

import { db } from '@/lib/db'
import { searchEvents } from '@/lib/google-search'
import { logger } from '@/lib/logger'

/**
 * Search for events near the user
 */
export async function searchEventsNearUser(
  query: string,
  userId: string,
  location?: string
): Promise<any[]> {
  try {
    // Get user's location if not provided
    let userLocation = location
    
    if (!userLocation) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { location: true }
      })
      userLocation = user?.location || 'Salt Lake City, UT'
    }

    // Search for events
    const events = await searchEvents(query, userLocation, { limit: 5 })
    
    logger.info('AI searched events:', { query, location: userLocation, count: events.length })
    
    return events
  } catch (error) {
    logger.error('Error in searchEventsNearUser:', error)
    return []
  }
}

/**
 * Get user's recent hangout places
 */
export async function getUserRecentPlaces(userId: string): Promise<string[]> {
  try {
    const recentHangouts = await db.content.findMany({
      where: {
        creatorId: userId,
        type: 'HANGOUT',
        location: { not: null }
      },
      select: { location: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const places = recentHangouts
      .map(h => h.location)
      .filter((l): l is string => !!l)
    
    // Return unique places
    return [...new Set(places)]
  } catch (error) {
    logger.error('Error getting user recent places:', error)
    return []
  }
}

/**
 * Get user's friends
 */
export async function getUserFriends(userId: string): Promise<{
  id: string
  name: string
  username: string
}[]> {
  try {
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACTIVE' },
          { friendId: userId, status: 'ACTIVE' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    const friends = friendships.map(f => 
      f.userId === userId ? f.friend : f.user
    )

    return friends
  } catch (error) {
    logger.error('Error getting user friends:', error)
    return []
  }
}

/**
 * Check friend availability for a given date/time
 */
export async function getFriendAvailability(
  friendIds: string[],
  dateTime: string
): Promise<{
  friendId: string
  available: boolean
  conflictingHangout?: string
}[]> {
  try {
    const targetDate = new Date(dateTime)
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Find hangouts that friends are in on that day
    const conflicts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        startTime: {
          gte: dayStart,
          lte: dayEnd
        },
        content_participants: {
          some: {
            userId: { in: friendIds }
          }
        }
      },
      include: {
        content_participants: {
          where: {
            userId: { in: friendIds }
          },
          select: {
            userId: true
          }
        }
      }
    })

    // Build availability map
    const availability = friendIds.map(friendId => {
      const conflict = conflicts.find(c => 
        c.content_participants.some(p => p.userId === friendId)
      )

      return {
        friendId,
        available: !conflict,
        conflictingHangout: conflict?.title
      }
    })

    return availability
  } catch (error) {
    logger.error('Error checking friend availability:', error)
    return friendIds.map(id => ({ friendId: id, available: true }))
  }
}

/**
 * Create a draft hangout object (doesn't save to DB)
 */
export function createHangoutDraft(details: {
  title: string
  description?: string
  location?: string
  dateTime?: string
  participants?: string[]
}): any {
  return {
    title: details.title,
    description: details.description || '',
    location: details.location || '',
    type: 'quick_plan',
    privacyLevel: 'PUBLIC',
    options: [{
      id: `option_${Date.now()}`,
      title: details.title,
      location: details.location || '',
      dateTime: details.dateTime || '',
      description: details.description || '',
      price: 0
    }],
    participants: details.participants || []
  }
}

/**
 * Function declarations for Gemini (schema format)
 */
export const functionDeclarations = [
  {
    name: 'searchEventsNearUser',
    description: 'Search for events and activities near the user\'s location',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "concerts", "food festivals")'
        },
        location: {
          type: 'string',
          description: 'City or location to search in (optional)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'getUserRecentPlaces',
    description: 'Get a list of places the user has recently visited for hangouts',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getUserFriends',
    description: 'Get a list of the user\'s friends',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getFriendAvailability',
    description: 'Check if friends are available at a specific date and time',
    parameters: {
      type: 'object',
      properties: {
        friendIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of friend user IDs'
        },
        dateTime: {
          type: 'string',
          description: 'ISO date-time string'
        }
      },
      required: ['friendIds', 'dateTime']
    }
  }
]
