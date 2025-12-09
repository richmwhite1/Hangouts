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
    // Use development schema (userId/friendId) - this is what the database uses
    logger.debug('Fetching friends using userId/friendId schema', { userId })
    
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACTIVE' as any },
          { friendId: userId, status: 'ACTIVE' as any }
        ]
      },
      select: {
        id: true,
        userId: true,
        friendId: true,
        status: true,
        createdAt: true,
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

    const friendsMap = new Map<string, UniversalFriend>()
    
    friendships.forEach(friendship => {
      try {
        const friendUser = friendship.userId === userId ? friendship.friend : friendship.user
        // Handle null friend/user gracefully
        if (!friendUser) {
          logger.warn(`Friendship ${friendship.id} has null friend/user, skipping`)
          return
        }
        
        // Deduplicate by friend ID - if we already have this friend, keep the one with the earliest createdAt
        const existingFriend = friendsMap.get(friendUser.id)
        if (existingFriend) {
          // Keep the friendship with the earliest createdAt date
          if (friendship.createdAt < existingFriend.createdAt) {
            friendsMap.set(friendUser.id, {
              id: friendship.id,
              friend: friendUser,
              status: friendship.status || 'ACTIVE',
              createdAt: friendship.createdAt
            })
          }
        } else {
          friendsMap.set(friendUser.id, {
            id: friendship.id,
            friend: friendUser,
            status: friendship.status || 'ACTIVE',
            createdAt: friendship.createdAt
          })
        }
      } catch (mapError: any) {
        logger.warn(`Error mapping friendship ${friendship.id}:`, mapError?.message || String(mapError))
      }
    })

    const friends = Array.from(friendsMap.values())
    logger.info(`Successfully fetched ${friends.length} unique friends (from ${friendships.length} friendships)`, { userId })
    return friends

  } catch (error: any) {
    // Log the full error for debugging
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack || ''
    const errorName = error?.name || 'UnknownError'
    
    logger.error('Error fetching friends:', {
      message: errorMessage,
      name: errorName,
      stack: errorStack,
      error: error,
      userId
    })
    
    // Re-throw with a clear message
    throw new Error(`Failed to fetch friends: ${errorMessage}`)
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






