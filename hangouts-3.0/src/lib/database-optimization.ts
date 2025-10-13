/**
 * Database Optimization Utilities
 * 
 * This file contains optimized database queries to prevent N+1 problems
 * and improve performance for scalable operations.
 */

import { db } from './db'

/**
 * Optimized hangout fetching with all related data in single query
 */
export async function getHangoutWithAllData(hangoutId: string) {
  return await db.content.findUnique({
    where: { id: hangoutId },
    select: {
      id: true,
      title: true,
      description: true,
      image: true,
      location: true,
      startTime: true,
      endTime: true,
      privacyLevel: true,
      creatorId: true,
      createdAt: true,
      updatedAt: true,
      maxParticipants: true,
      priceMin: true,
      priceMax: true,
      ticketUrl: true,
      weatherEnabled: true,
      // Creator info (single query)
      users: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          isActive: true
        }
      },
      // Participants with user data (single query)
      content_participants: {
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              isActive: true
            }
          }
        }
      },
      // Polls (single query)
      polls: true,
      // RSVPs (single query)
      rsvps: {
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
      },
      // Counts (single query)
      _count: {
        select: {
          content_participants: true,
          comments: true,
          messages: true,
          photos: true,
          rsvps: true
        }
      }
    }
  })
}

/**
 * Optimized feed query with pagination and minimal data
 */
export async function getOptimizedFeed(
  userId: string,
  feedType: 'home' | 'discover' = 'home',
  limit: number = 20,
  offset: number = 0
) {
  const whereClause: any = {
    status: 'ACTIVE',
    type: 'HANGOUT'
  }

  if (feedType === 'home') {
    whereClause.OR = [
      { creatorId: userId },
      {
        content_participants: {
          some: { userId }
        }
      }
    ]
  } else {
    whereClause.OR = [
      { privacyLevel: 'PUBLIC' },
      { creatorId: userId }
    ]
  }

  // Single query with all needed data
  const [content, totalCount] = await Promise.all([
    db.content.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        location: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        createdAt: true,
        creatorId: true,
        // Creator info
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        // Essential counts only
        _count: {
          select: {
            content_participants: true,
            comments: true,
            photos: true
          }
        }
      },
      orderBy: feedType === 'home' ? { createdAt: 'desc' } : { startTime: 'asc' },
      take: limit,
      skip: offset
    }),
    db.content.count({ where: whereClause })
  ])

  return { content, totalCount, hasMore: offset + content.length < totalCount }
}

/**
 * Optimized voting data aggregation
 */
export async function getVotingData(hangoutId: string) {
  const poll = await db.polls.findFirst({
    where: { contentId: hangoutId },
    include: {
      pollVotes: {
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      }
    }
  })

  if (!poll) return null

  // Calculate vote counts efficiently
  const voteCounts: Record<string, { count: number; voters: any[] }> = {}
  poll.pollVotes.forEach(vote => {
    const optionId = vote.optionId
    if (!voteCounts[optionId]) {
      voteCounts[optionId] = { count: 0, voters: [] }
    }
    voteCounts[optionId].count++
    voteCounts[optionId].voters.push({
      id: vote.users.id,
      username: vote.users.username,
      name: vote.users.name
    })
  })

  return {
    poll,
    voteCounts,
    totalVotes: poll.pollVotes.length,
    consensusReached: poll.status === 'CONSENSUS_REACHED'
  }
}

/**
 * Batch user data fetching to prevent N+1 queries
 */
export async function getBatchUserData(userIds: string[]) {
  if (userIds.length === 0) return []
  
  return await db.user.findMany({
    where: {
      id: { in: userIds }
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      isActive: true,
      lastSeen: true
    }
  })
}

/**
 * Optimized notification fetching
 */
export async function getOptimizedNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await db.notification.findMany({
    where: {
      userId,
      isDismissed: false
    },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      data: true,
      isRead: true,
      createdAt: true,
      readAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })
}