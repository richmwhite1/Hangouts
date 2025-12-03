/**
 * Universal Friendship Queries
 * 
 * This module provides database queries that work with both friendship schemas:
 * - Development: userId/friendId with status field
 * - Production: user1Id/user2Id without status field
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export interface UniversalFriend {
  id: string
  friend: {
    id: string
    username: string
    name: string
    email: string
    avatar: string | null
    bio: string | null
    location: string | null
  }
  status: string
  createdAt: Date
}

export interface FriendshipCheckResult {
  areFriends: boolean
  friendshipId?: string
}

/**
 * Check if two users are friends using either schema
 */
export async function checkFriendship(userId1: string, userId2: string): Promise<FriendshipCheckResult> {
  try {
    // Try development schema first (userId/friendId)
    const devFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: userId1, friendId: userId2, status: 'ACTIVE' },
          { userId: userId2, friendId: userId1, status: 'ACTIVE' }
        ]
      }
    })

    if (devFriendship) {
      return { areFriends: true, friendshipId: devFriendship.id }
    }

  } catch (devError) {
    logger.debug('Development schema check failed, trying production schema:', devError.message)
  }

  try {
    // Try production schema (user1Id/user2Id)
    const prodFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId1, user2Id: userId2 },
          { user1Id: userId2, user2Id: userId1 }
        ]
      }
    })

    if (prodFriendship) {
      return { areFriends: true, friendshipId: prodFriendship.id }
    }

  } catch (prodError) {
    logger.error('Both friendship schema checks failed:', { devError: devError?.message, prodError: prodError.message })
  }

  return { areFriends: false }
}

/**
 * Get all friends for a user using either schema
 */
export async function getUserFriends(userId: string): Promise<UniversalFriend[]> {
  try {
    // Try development schema first (userId/friendId)
    logger.debug('Attempting to fetch friends using userId/friendId schema')
    
    const devFriendships = await db.friendship.findMany({
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
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        }
      }
    })

    const devFriends = devFriendships.map(friendship => {
      const friendUser = friendship.userId === userId ? friendship.friend : friendship.user
      return {
        id: friendship.id,
        friend: friendUser,
        status: friendship.status || 'ACTIVE',
        createdAt: friendship.createdAt
      }
    })

    logger.info(`Successfully fetched ${devFriends.length} friends using userId/friendId schema`)
    return devFriends

  } catch (devError) {
    logger.debug('Development schema failed, trying production schema:', devError.message)
  }

  try {
    // Try production schema (user1Id/user2Id)
    logger.debug('Attempting to fetch friends using user1Id/user2Id schema')
    
    const prodFriendships = await db.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        },
        user2: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        }
      }
    })

    const prodFriends = prodFriendships.map(friendship => {
      const friendUser = friendship.user1Id === userId ? friendship.user2 : friendship.user1
      return {
        id: friendship.id,
        friend: friendUser,
        status: 'ACTIVE', // Default status for production schema
        createdAt: friendship.createdAt
      }
    })

    logger.info(`Successfully fetched ${prodFriends.length} friends using user1Id/user2Id schema`)
    return prodFriends

  } catch (prodError) {
    logger.error('Both friendship schemas failed:', { devError: devError?.message, prodError: prodError.message })
    throw new Error('Unable to fetch friends with either schema')
  }
}

/**
 * Create a friendship using the appropriate schema
 */
export async function createFriendship(userId1: string, userId2: string): Promise<{ success: boolean, friendshipIds?: string[] }> {
  try {
    // Try development schema first (userId/friendId with bidirectional entries)
    logger.debug('Attempting to create friendship using userId/friendId schema')
    
    const friendship1 = await db.friendship.create({
      data: {
        userId: userId1,
        friendId: userId2,
        status: 'ACTIVE'
      }
    })

    const friendship2 = await db.friendship.create({
      data: {
        userId: userId2,
        friendId: userId1,
        status: 'ACTIVE'
      }
    })

    logger.info('Successfully created bidirectional friendship using userId/friendId schema')
    return { success: true, friendshipIds: [friendship1.id, friendship2.id] }

  } catch (devError) {
    logger.debug('Development schema failed, trying production schema:', devError.message)
  }

  try {
    // Try production schema (user1Id/user2Id with single entry)
    logger.debug('Attempting to create friendship using user1Id/user2Id schema')
    
    // Ensure consistent ordering (smaller ID first)
    const [user1Id, user2Id] = [userId1, userId2].sort()
    
    const friendship = await db.friendship.create({
      data: {
        user1Id,
        user2Id
      }
    })

    logger.info('Successfully created friendship using user1Id/user2Id schema')
    return { success: true, friendshipIds: [friendship.id] }

  } catch (prodError) {
    logger.error('Both friendship creation methods failed:', { devError: devError?.message, prodError: prodError.message })
    return { success: false }
  }
}

/**
 * Delete a friendship using either schema
 */
export async function deleteFriendship(userId1: string, userId2: string): Promise<{ success: boolean, deletedCount: number }> {
  let deletedCount = 0

  try {
    // Try development schema first (userId/friendId - delete both directions)
    const devDeleted = await db.friendship.deleteMany({
      where: {
        OR: [
          { userId: userId1, friendId: userId2 },
          { userId: userId2, friendId: userId1 }
        ]
      }
    })

    deletedCount += devDeleted.count
    logger.info(`Deleted ${devDeleted.count} friendships using userId/friendId schema`)

  } catch (devError) {
    logger.debug('Development schema deletion failed:', devError.message)
  }

  try {
    // Try production schema (user1Id/user2Id - delete single entry)
    const prodDeleted = await db.friendship.deleteMany({
      where: {
        OR: [
          { user1Id: userId1, user2Id: userId2 },
          { user1Id: userId2, user2Id: userId1 }
        ]
      }
    })

    deletedCount += prodDeleted.count
    logger.info(`Deleted ${prodDeleted.count} friendships using user1Id/user2Id schema`)

  } catch (prodError) {
    logger.debug('Production schema deletion failed:', prodError.message)
  }

  return { success: deletedCount > 0, deletedCount }
}




